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

async function importData() {
  await connectDB();
  const locationId = await getLocationId();

  const products = [];
  const batches = [];

  // Read Products CSV from parent directory
  const productsPath = path.resolve(process.cwd(), '../products.csv');
  console.log(`Reading products.csv from ${productsPath}...`);
  
  if (!fs.existsSync(productsPath)) {
      console.error(`Error: products.csv not found at ${productsPath}`);
      process.exit(1);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(productsPath)
      .pipe(csv())
      .on('data', (row) => {
        // Convert types
        row.taxRate = parseFloat(row.taxRate);
        row.minStockLevel = parseInt(row.minStockLevel);
        row.isDeleted = row.isDeleted === 'true';
        products.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Read Batches CSV from parent directory
  const batchesPath = path.resolve(process.cwd(), '../batches.csv');
  console.log(`Reading batches.csv from ${batchesPath}...`);

  if (!fs.existsSync(batchesPath)) {
      console.error(`Error: batches.csv not found at ${batchesPath}`);
      process.exit(1);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(batchesPath)
      .pipe(csv())
      .on('data', (row) => {
        // Convert types
        row.mrp = parseFloat(row.mrp);
        row.costPrice = parseFloat(row.costPrice);
        row.quantity = parseInt(row.quantity);
        // Handle stockDistribution manually since CSV parser flattens it
        // We look for keys starting with 'stockDistribution'
        const stockDistribution = [];
        
        // Check specifically for index 0 as generated
        const locKey = 'stockDistribution.0.location';
        const qtyKey = 'stockDistribution.0.quantity';
        
        if (row[locKey] && row[qtyKey]) {
             stockDistribution.push({
               location: locationId, // Use the real ID
               quantity: parseInt(row[qtyKey])
             });
             // Remove flattened keys to clean up
             delete row[locKey];
             delete row[qtyKey];
        }
        
        row.stockDistribution = stockDistribution;
        batches.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Found ${products.length} products and ${batches.length} batches to import.`);

  try {
    // Insert Products
    // Check if products exist first to avoid duplicate key errors on _id
    const existingProductIds = new Set((await Product.find({}, '_id').lean()).map(p => p._id.toString()));
    const newProducts = products.filter(p => !existingProductIds.has(p._id));
    
    if (newProducts.length > 0) {
      await Product.insertMany(newProducts);
      console.log(`Imported ${newProducts.length} new products.`);
    } else {
      console.log('No new products to import (all IDs exist).');
    }

    // Insert Batches
    // Check for duplicate batchNumbers to be safe
    const existingBatchNumbers = new Set((await Batch.find({}, 'batchNumber').lean()).map(b => b.batchNumber));
    const newBatches = batches.filter(b => !existingBatchNumbers.has(b.batchNumber));

    if (newBatches.length > 0) {
      await Batch.insertMany(newBatches);
      console.log(`Imported ${newBatches.length} new batches.`);
    } else {
      console.log('No new batches to import (all batchNumbers exist).');
    }

    console.log('Data import completed successfully.');
    
    // Verify counts
    const productCount = await Product.countDocuments();
    const batchCount = await Batch.countDocuments();
    console.log(`Total Products in DB: ${productCount}`);
    console.log(`Total Batches in DB: ${batchCount}`);

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
