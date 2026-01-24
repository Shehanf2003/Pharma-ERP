import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5001/api';
let cookie = '';

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(BASE_URL + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  }

  return res;
}

async function getMongoUri() {
  const logPath = path.resolve('..', 'backend_v2.log');
  if (!fs.existsSync(logPath)) return null;
  const logContent = fs.readFileSync(logPath, 'utf8');
  const match = logContent.match(/Using In-Memory MongoDB: (mongodb:\/\/[^\s]+)/);
  if (match) return match[1];
  return null;
}

async function seedUser() {
  const uri = await getMongoUri();
  if (!uri) {
      console.log("Could not find In-Memory MongoDB URI in log. Skipping direct seed.");
      return;
  }
  console.log(`Connecting to In-Memory DB at ${uri} to seed admin...`);
  const conn = await mongoose.connect(uri);

  const db = conn.connection.db;
  const users = db.collection('users');

  await users.deleteMany({ email: "admin@test.com" });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("password123", salt);

  await users.insertOne({
      name: "Super Admin",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
      allowedModules: ["INVENTORY", "POS", "FINANCE", "REPORTING"],
      createdAt: new Date(),
      updatedAt: new Date()
  });

  console.log("Admin seeded.");
  await mongoose.disconnect();
}

async function run() {
  console.log('--- Starting POS API Verification ---');

  // 0. Seed User directly
  try {
      await seedUser();
  } catch (e) {
      console.error("Seeding failed:", e);
  }

  // 1. Login
  console.log('1. Logging in...');
  let res = await request('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
  });

  if (!res.ok) {
     const text = await res.text();
     console.log('Login failed:', res.status, text);
     return;
  }
  console.log('Login successful.');

  const unique = Date.now();

  // 2. Add Product
  console.log('2. Adding Product...');
  const productPayload = {
      name: `Paracetamol ${unique}`,
      genericName: "Acetaminophen",
      category: "Medicine",
      minStockLevel: 10
  };
  res = await request('POST', '/inventory/products', productPayload);
  const product = await res.json();
  if (!res.ok) { console.error('Add Product Failed:', product); return; }
  console.log('Product created:', product._id);

  // 3. Add Batch
  console.log('3. Adding Batch...');
  const batchPayload = {
      productId: product._id,
      batchNumber: `BATCH-${unique}`,
      expiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
      mrp: 100,
      costPrice: 50,
      quantity: 50
  };
  res = await request('POST', '/inventory/batches', batchPayload);
  const batch = await res.json();
  if (!res.ok) { console.error('Add Batch Failed:', batch); return; }
  console.log('Batch created:', batch._id);

  // 4. Create Sale
  console.log('4. Creating Sale...');
  const salePayload = {
      items: [{
          productId: product._id,
          batchId: batch._id,
          quantity: 2,
          price: 100
      }],
      paymentMethod: 'Cash'
  };
  res = await request('POST', '/pos/sales', salePayload);
  const sale = await res.json();
  console.log('Sale created:', res.status, sale.receiptNumber);

  if (res.status !== 201) {
      console.error('Sale failed:', sale);
      process.exit(1);
  }

  // 5. Verify Stock Deduction
  console.log('5. Verifying Stock...');
  res = await request('GET', '/pos/products');
  const posProducts = await res.json();
  const p = posProducts.find(p => p._id === product._id);
  const b = p.batches.find(b => b.batchNumber === batchPayload.batchNumber);
  console.log(`Initial Qty: 50, Sold: 2, Remaining: ${b.quantity}`);

  if (b.quantity === 48) {
      console.log('SUCCESS: Stock updated correctly.');
  } else {
      console.error('FAILURE: Stock mismatch.');
      process.exit(1);
  }
}

run().catch(console.error);
