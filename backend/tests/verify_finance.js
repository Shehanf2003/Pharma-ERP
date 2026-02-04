import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Product from '../models/Product.js';
import Batch from '../models/Batch.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import { createSale } from '../controllers/pos.controller.js';
import { getFinancialStats } from '../controllers/finance.controller.js';

// Mock Response object
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runTest() {
  console.log("Starting Verification...");

  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();

  await mongoose.connect(uri);

  try {
    // 1. Setup Data
    const product = await Product.create({
      name: "Test Pill",
      minStockLevel: 5
    });

    const batch = await Batch.create({
      productId: product._id,
      batchNumber: "B001",
      expiryDate: new Date("2025-12-31"),
      mrp: 200,
      costPrice: 100,
      quantity: 50
    });

    // 2. Test Create Sale (Check Cost Capture)
    console.log("Testing Sale Creation (Cost Capture)...");
    const reqSale = {
      body: {
        items: [{
          productId: product._id.toString(),
          batchId: batch._id.toString(),
          quantity: 2,
          price: 200
        }],
        paymentMethod: 'Cash'
      },
      user: { _id: new mongoose.Types.ObjectId() } // Mock user
    };

    const resSale = mockRes();
    await createSale(reqSale, resSale);

    if (resSale.statusCode === 201) {
       const sale = await Sale.findById(resSale.body._id);
       if (sale.items[0].costPrice === 100) {
           console.log("PASS: Cost Price captured correctly.");
       } else {
           console.error("FAIL: Cost Price not captured. Got:", sale.items[0].costPrice);
       }
    } else {
        console.error("FAIL: Sale creation failed", resSale.body);
    }

    // 3. Test Financial Stats
    console.log("Testing Financial Stats...");
    // Add an expense
    await Expense.create({
        description: "Test Expense",
        amount: 50,
        category: "Other",
        createdBy: reqSale.user._id
    });

    const reqStats = { query: {} };
    const resStats = mockRes();
    await getFinancialStats(reqStats, resStats);

    const stats = resStats.body;
    // Expected:
    // Revenue: 400 (2 * 200)
    // COGS: 200 (2 * 100)
    // Expenses: 50
    // Net Profit: 400 - 200 - 50 = 150

    if (stats.totalRevenue === 400 && stats.totalCOGS === 200 && stats.totalExpenses === 50 && stats.netProfit === 150) {
        console.log("PASS: Financial Stats calculated correctly.");
    } else {
        console.error("FAIL: Financial Stats incorrect.", stats);
    }

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

runTest();
