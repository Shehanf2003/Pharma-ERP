import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Use Models - paths adjusted for being inside backend/
import Product from './models/Product.js';
import Batch from './models/Batch.js';
import Location from './models/Location.js';
import Customer from './models/Customer.js';
import Sale from './models/Sale.js';
import User from './models/User.js';

// Load env from parent directory (root) or current
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
// Fallback to local .env if root one fails or doesn't exist, though usually we want the root one.
if (!process.env.MONGO_URI) {
    dotenv.config(); 
}

// We will use MongoMemoryServer to run this standalone, as connecting to an external one proved flaky
let mongoServer;

async function connectDB() {
  try {
      if (!process.env.MONGO_URI) {
          console.log('\x1b[33m%s\x1b[0m', 'WARNING: No MONGO_URI found in environment variables.');
          console.log('\x1b[33m%s\x1b[0m', 'Using temporary IN-MEMORY database. Data will NOT be saved persistently.');
          
          // Start a fresh instance for this import script
          mongoServer = await MongoMemoryServer.create();
          const uri = mongoServer.getUri();
          console.log(`Using In-Memory MongoDB: ${uri}`);
          await mongoose.connect(uri);
      } else {
          // Mask the URI for security in logs
          const maskedURI = process.env.MONGO_URI.replace(/(:.*@)/, ':****@');
          console.log(`Connecting to persistent database: ${maskedURI}`);
          await mongoose.connect(process.env.MONGO_URI);
      }
      
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

async function getLocationId() {
  try {
    let location = await Location.findOne();
    if (!location) {
      console.log('No location found. Creating a default location...');
      location = await Location.create({
        name: 'Main Warehouse',
        address: '123 Main St, Colombo',
        phone: '0112345678',
        email: 'warehouse@example.com',
        type: 'Warehouse',
        isActive: true
      });
      console.log('Created default location:', location._id);
    } else {
      console.log('Using existing location:', location._id);
    }
    return location._id;
  } catch (error) {
    console.error('Error fetching/creating location:', error);
    process.exit(1);
  }
}

async function getUserId() {
  try {
    let user = await User.findOne();
    if (!user) {
      console.log('No user found. Creating a default admin user...');
      user = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123', // Will be hashed by pre-save hook
        role: 'admin',
        allowedModules: ['INVENTORY', 'POS', 'FINANCE', 'REPORTING']
      });
      console.log('Created default user:', user._id);
    } else {
      console.log('Using existing user (Cashier):', user._id);
    }
    return user._id;
  } catch (error) {
    console.error('Error fetching/creating user:', error);
    process.exit(1);
  }
}

async function readCSV(filename) {
  const results = [];
  const filePath = path.resolve(process.cwd(), `../${filename}`);
  console.log(`Reading ${filename} from ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
      console.log(`Warning: ${filename} not found at ${filePath}. Skipping.`);
      return [];
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function importData() {
  await connectDB();
  const locationId = await getLocationId();
  const userId = await getUserId();

  const products = await readCSV('products.csv');
  const batches = await readCSV('batches.csv');
  const customers = await readCSV('customers.csv');
  const sales = await readCSV('sales.csv');

  console.log(`Found ${products.length} products, ${batches.length} batches, ${customers.length} customers, and ${sales.length} sales to import.`);

  try {
    // --- Products ---
    const existingProductIds = new Set((await Product.find({}, '_id').lean()).map(p => p._id.toString()));
    const newProducts = products
      .map(p => ({
        ...p,
        taxRate: parseFloat(p.taxRate),
        minStockLevel: parseInt(p.minStockLevel),
        isDeleted: p.isDeleted === 'true'
      }))
      .filter(p => !existingProductIds.has(p._id));
    
    if (newProducts.length > 0) {
      await Product.insertMany(newProducts);
      console.log(`Imported ${newProducts.length} new products.`);
    }

    // --- Batches ---
    const existingBatchNumbers = new Set((await Batch.find({}, 'batchNumber').lean()).map(b => b.batchNumber));
    const newBatches = [];

    for (const row of batches) {
       if (existingBatchNumbers.has(row.batchNumber)) continue;

       const stockDistribution = [];
       const locKey = 'stockDistribution.0.location';
       const qtyKey = 'stockDistribution.0.quantity';

       if (row[locKey] && row[qtyKey]) {
            stockDistribution.push({
              location: locationId,
              quantity: parseInt(row[qtyKey])
            });
            delete row[locKey];
            delete row[qtyKey];
       }

       newBatches.push({
         ...row,
         mrp: parseFloat(row.mrp),
         costPrice: parseFloat(row.costPrice),
         quantity: parseInt(row.quantity),
         stockDistribution
       });
    }

    if (newBatches.length > 0) {
      await Batch.insertMany(newBatches);
      console.log(`Imported ${newBatches.length} new batches.`);
    }

    // --- Customers ---
    const existingCustomerIds = new Set((await Customer.find({}, '_id').lean()).map(c => c._id.toString()));
    const newCustomers = customers
      .map(c => ({
        ...c,
        loyaltyPoints: parseInt(c.loyaltyPoints)
      }))
      .filter(c => !existingCustomerIds.has(c._id));

    if (newCustomers.length > 0) {
      await Customer.insertMany(newCustomers);
      console.log(`Imported ${newCustomers.length} new customers.`);
    }

    // --- Sales ---
    // 1. Build BatchNumber -> BatchId map
    const allBatches = await Batch.find({}, 'batchNumber _id').lean();
    const batchMap = new Map();
    allBatches.forEach(b => batchMap.set(b.batchNumber, b._id));

    // 2. Check existing sales (by receiptNumber)
    const existingReceipts = new Set((await Sale.find({}, 'receiptNumber').lean()).map(s => s.receiptNumber));
    const newSales = [];

    for (const row of sales) {
      if (existingReceipts.has(row.receiptNumber)) continue;

      const items = [];
      // Flattened items: items.0.productId, items.0.batchNumber, etc.
      // We assume max 5 items based on generator, but let's iterate dynamically
      let i = 0;
      while (row[`items.${i}.productId`]) {
        const batchNumber = row[`items.${i}.batchNumber`];
        const batchId = batchMap.get(batchNumber);

        if (batchId) {
          items.push({
            productId: row[`items.${i}.productId`],
            batchId: batchId,
            quantity: parseInt(row[`items.${i}.quantity`]),
            price: parseFloat(row[`items.${i}.price`]),
            costPrice: parseFloat(row[`items.${i}.costPrice`])
          });
        } else {
            // Warn if batch missing? For generated data it should exist.
            // console.warn(`Batch ${batchNumber} not found for sale ${row.receiptNumber}`);
        }
        i++;
      }

      // Cleanup flattened keys? Not strictly necessary as insertMany ignores extra fields defined in schema unless strict: throw
      // But Mongoose strict mode defaults to true (removes unknown), so we just construct the object cleanly.

      const saleObj = {
        receiptNumber: row.receiptNumber,
        items: items,
        totalAmount: parseFloat(row.totalAmount),
        paymentMethod: row.paymentMethod,
        status: row.status,
        createdAt: row.createdAt, // Mongoose handles string -> date
        updatedAt: row.createdAt,
        customerId: row.customerId || null, // Handle empty string
        cashierId: userId // Replace placeholder
      };

      if (saleObj.customerId === '') saleObj.customerId = null;

      newSales.push(saleObj);
    }

    if (newSales.length > 0) {
      // Chunk insertions if too large? 1800 records is fine for one batch usually, but let's be safe
      const chunkSize = 500;
      for (let i = 0; i < newSales.length; i += chunkSize) {
          const chunk = newSales.slice(i, i + chunkSize);
          await Sale.insertMany(chunk);
          console.log(`Imported sales chunk ${i/chunkSize + 1} (${chunk.length} records).`);
      }
      console.log(`Imported total ${newSales.length} new sales.`);
    } else {
      console.log('No new sales to import.');
    }

    console.log('Data import completed successfully.');

    // Verify
    const saleCount = await Sale.countDocuments();
    console.log(`Total Sales in DB: ${saleCount}`);

  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

importData();
