import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';

// Paths
const PRODUCTS_CSV = path.resolve(process.cwd(), '../products.csv');
const BATCHES_CSV = path.resolve(process.cwd(), '../batches.csv');
const CUSTOMERS_CSV = path.resolve(process.cwd(), '../customers.csv');
const SALES_CSV = path.resolve(process.cwd(), '../sales.csv');

// Helpers
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const generateObjectId = () => new mongoose.Types.ObjectId().toString();

// Data Generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];

const generateCustomer = () => {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1, 999)}@${getRandomElement(domains)}`;
  const phone = `07${getRandomInt(0, 9)}${getRandomInt(1000000, 9999999)}`;

  return {
    _id: generateObjectId(),
    name,
    email,
    phoneNumber: phone,
    address: `${getRandomInt(1, 999)} Main St, Colombo`,
    loyaltyPoints: getRandomInt(0, 500),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const loadCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
        return resolve([]); // Handle missing file gracefully or error out
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

const writeCSV = (filePath, data) => {
  if (data.length === 0) return;

  // Extract headers from the first object
  // For nested objects (like items in sales), we expect them to be already flattened in the data object
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      let val = row[fieldName];
      // Handle commas in strings
      if (typeof val === 'string' && val.includes(',')) {
        val = `"${val}"`;
      }
      return val;
    }).join(','))
  ].join('\n');

  fs.writeFileSync(filePath, csvContent);
  console.log(`Generated ${filePath} with ${data.length} records.`);
};

async function main() {
  console.log('Loading source data...');
  const products = await loadCSV(PRODUCTS_CSV);
  const batches = await loadCSV(BATCHES_CSV);

  if (products.length === 0 || batches.length === 0) {
    console.error('Error: products.csv or batches.csv is empty or missing.');
    process.exit(1);
  }

  // Create lookup for batch details (price, cost)
  // We need to map batchNumber to product details too
  const batchMap = new Map();
  batches.forEach(b => {
    // batchNumber is unique
    batchMap.set(b.batchNumber, {
      ...b,
      mrp: parseFloat(b.mrp),
      costPrice: parseFloat(b.costPrice)
    });
  });

  console.log('Generating customers...');
  const customers = [];
  for (let i = 0; i < 50; i++) {
    customers.push(generateCustomer());
  }
  writeCSV(CUSTOMERS_CSV, customers);

  console.log('Generating sales history (last 90 days)...');
  const sales = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  let currentDate = new Date(startDate);
  let receiptSequence = 1000;

  while (currentDate <= endDate) {
    const dailySalesCount = getRandomInt(15, 25);

    for (let i = 0; i < dailySalesCount; i++) {
      // Create a specific time for this sale within business hours (8 AM - 8 PM)
      const saleDate = new Date(currentDate);
      saleDate.setHours(getRandomInt(8, 20), getRandomInt(0, 59), getRandomInt(0, 59));

      const isGuest = Math.random() > 0.7; // 30% chance of guest
      const customer = isGuest ? null : getRandomElement(customers);

      const numItems = getRandomInt(1, 5);
      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const batch = getRandomElement(batches);
        const qty = getRandomInt(1, 3);
        const price = parseFloat(batch.mrp);
        const cost = parseFloat(batch.costPrice);

        items.push({
          productId: batch.productId,
          batchNumber: batch.batchNumber, // Critical for linking during import
          quantity: qty,
          price: price,
          costPrice: cost
        });

        totalAmount += (price * qty);
      }

      // Flatten items for CSV
      const flatSale = {
        receiptNumber: `REC-${saleDate.getFullYear()}${(saleDate.getMonth()+1).toString().padStart(2,'0')}${saleDate.getDate().toString().padStart(2,'0')}-${receiptSequence++}`,
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: getRandomElement(['Cash', 'Card', 'Online']),
        status: 'completed',
        createdAt: saleDate.toISOString(),
        customerId: customer ? customer._id : '',
        cashierId: 'PLACEHOLDER_CASHIER_ID',
        // Flatten items
        ...items.reduce((acc, item, idx) => {
          acc[`items.${idx}.productId`] = item.productId;
          acc[`items.${idx}.batchNumber`] = item.batchNumber;
          acc[`items.${idx}.quantity`] = item.quantity;
          acc[`items.${idx}.price`] = item.price;
          acc[`items.${idx}.costPrice`] = item.costPrice;
          return acc;
        }, {})
      };

      sales.push(flatSale);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Ensure all rows have the same columns (max items)
  // Find max items count
  let maxItems = 0;
  sales.forEach(s => {
      // count keys starting with items.
      const count = Object.keys(s).filter(k => k.startsWith('items.') && k.endsWith('.productId')).length;
      if (count > maxItems) maxItems = count;
  });

  // Fill missing item columns with empty strings
  sales.forEach(s => {
      for (let i = 0; i < maxItems; i++) {
          if (!s[`items.${i}.productId`]) {
              s[`items.${i}.productId`] = '';
              s[`items.${i}.batchNumber`] = '';
              s[`items.${i}.quantity`] = '';
              s[`items.${i}.price`] = '';
              s[`items.${i}.costPrice`] = '';
          }
      }
  });

  writeCSV(SALES_CSV, sales);
  console.log('Done.');
}

main().catch(console.error);
