import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';

// Use Models
import Product from './models/Product.js';
import Batch from './models/Batch.js';
import Customer from './models/Customer.js';
import Sale from './models/Sale.js';
import User from './models/User.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.MONGO_URI) {
    dotenv.config();
}

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function startSimulation() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Live Simulation.');

        // Fetch necessary base data
        const cashier = await User.findOne({ role: 'admin' }) || { _id: 'PLACEHOLDER_CASHIER' };
        const customers = await Customer.find().lean();
        const batches = await Batch.find().populate('productId').lean();

        if (batches.length === 0) {
            console.error("No batches found in DB. Please run import_data.js first.");
            process.exit(1);
        }

        // 1. Setup Pareto Principle Weights
        const weightedBatches = batches.map((b, index) => {
            let weight = 0.05; // Slow moving
            const percentile = index / batches.length;
            if (percentile < 0.2) weight = 0.70; // Top 20% get 70% volume
            else if (percentile < 0.5) weight = 0.25; // Next 30% get 25% volume
            return { ...b, weight };
        });

        const totalBatchWeight = weightedBatches.reduce((sum, b) => sum + b.weight, 0);

        function getRandomBatchWithWeight() {
            const random = Math.random() * totalBatchWeight;
            let cumulativeWeight = 0;
            for (const batch of weightedBatches) {
                cumulativeWeight += batch.weight;
                if (random <= cumulativeWeight) return batch;
            }
            return weightedBatches[weightedBatches.length - 1];
        }

        console.log('Simulation ready. Starting Cron Job...');
        console.log('Will attempt to generate a sale every 2 minutes during business hours (8 AM - 8 PM).');

        // 2. Schedule the Cron Job (Runs every 2 minutes)
        // Cron syntax: '*/2 * * * *' means every 2 minutes
        cron.schedule('*/2 * * * *', async () => {
            const now = new Date();
            const currentHour = now.getHours();

            // Only generate sales during typical business hours
            if (currentHour < 8 || currentHour >= 20) {
                console.log(`[${now.toLocaleTimeString()}] Outside business hours. Skipping...`);
                return;
            }

            // Add some randomness so it doesn't trigger exactly every 2 minutes perfectly
            if (Math.random() > 0.6) {
                console.log(`[${now.toLocaleTimeString()}] No customer right now...`);
                return; // 40% chance of no sale happening this tick
            }

            try {
                const month = now.getMonth();
                const isGuest = Math.random() > 0.7;
                const customer = isGuest ? null : getRandomElement(customers);

                const numItems = getRandomInt(1, 4);
                const items = [];
                let totalAmount = 0;

                for (let j = 0; j < numItems; j++) {
                    const batch = getRandomBatchWithWeight();
                    const productName = (batch.productId?.name || '').toLowerCase();

                    // Seasonal logic check
                    let minQty = 1;
                    let maxQty = 3;
                    if ((productName.includes('cough') || productName.includes('vitamin') || productName.includes('paracetamol')) && [10, 11, 0].includes(month)) {
                        minQty = 3;
                        maxQty = 6;
                    }

                    const qty = getRandomInt(minQty, maxQty);
                    const price = batch.mrp;
                    const cost = batch.costPrice;

                    items.push({
                        productId: batch.productId._id,
                        batchId: batch._id,
                        quantity: qty,
                        price: price,
                        costPrice: cost
                    });

                    totalAmount += (price * qty);
                }

                const receiptNumber = `REC-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Date.now().toString().slice(-6)}`;

                const newSale = new Sale({
                    receiptNumber,
                    items,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    paymentMethod: getRandomElement(['Cash', 'Card', 'Online']),
                    status: 'completed',
                    customerId: customer ? customer._id : null,
                    cashierId: cashier._id
                });

                await newSale.save();
                console.log(`[${now.toLocaleTimeString()}] ✅ LIVE SALE GENERATED: ${receiptNumber} for Rs. ${newSale.totalAmount}`);

                // Deduct quantities from batches based on the generated sale
                for (const item of items) {
                    const batch = await Batch.findById(item.batchId);
                    if (batch) {
                        if (batch.stockDistribution && batch.stockDistribution.length > 0) {
                            let remaining = item.quantity;
                            for (const dist of batch.stockDistribution) {
                                if (remaining <= 0) break;
                                if (dist.quantity > 0) {
                                    const deduct = Math.min(dist.quantity, remaining);
                                    dist.quantity -= deduct;
                                    remaining -= deduct;
                                }
                            }

                            // Explicitly tell Mongoose that the array was modified so it saves the changes
                            batch.markModified('stockDistribution');
                            // Also manually sync the total batch quantity to ensure it decreases globally
                            batch.quantity = batch.stockDistribution.reduce((total, dist) => total + (dist.quantity || 0), 0);
                        } else {
                            batch.quantity = Math.max(0, batch.quantity - item.quantity);
                        }
                        await batch.save();
                    }
                }

            } catch (err) {
                console.error('Error generating live sale:', err.message);
            }
        });

    } catch (error) {
        console.error('Failed to start simulator:', error);
        process.exit(1);
    }
}

startSimulation();

// Keep the process alive
process.on('SIGINT', () => { process.exit(); });