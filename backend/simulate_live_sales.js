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

const REGIONAL_DATA = {
    "Western": { peakMonths: [5, 6, 9, 10, 11, 0], topMeds: ['paracetamol', 'ors', 'salbutamol', 'cetirizine', 'beclomethasone', 'co-amoxiclav'], multiplier: 2.0 }
};

// SPMC High-Volume Staples (Year-round fast movers)
const CHRONIC_NCD_MEDS = [
    'gliclazide', 'atorvastatin', 'prednisolone', 'losartan', 
    'salbutamol', 'levothyroxine', 'enalapril', 'diltiazem', 'metformin'
];

const CURRENT_PROVINCE = "Western"; 
const activeRegion = REGIONAL_DATA[CURRENT_PROVINCE];

// --- AUTO-SEEDER: Ensure required ML medicines exist ---
async function ensureSimulationProductsExist() {
    console.log("Checking for required ML simulation medicines...");

    const requiredMedicines = [
        // Chronic NCDs
        { name: 'Gliclazide 80mg', mrp: 18.00, category: 'Tablet' },
        { name: 'Atorvastatin 10mg', mrp: 35.00, category: 'Tablet' },
        { name: 'Prednisolone 5mg', mrp: 8.00, category: 'Tablet' },
        { name: 'Losartan 50mg', mrp: 25.00, category: 'Tablet' },
        { name: 'Levothyroxine 50mcg', mrp: 12.00, category: 'Tablet' },
        { name: 'Enalapril 5mg', mrp: 15.00, category: 'Tablet' },
        { name: 'Metformin 500mg', mrp: 15.00, category: 'Tablet' },
        { name: 'Diltiazem 30mg', mrp: 28.00, category: 'Tablet' },
        // Regional/Seasonal
        { name: 'Salbutamol Inhaler 100mcg', mrp: 550.00, category: 'Inhaler' },
        { name: 'Oral Rehydration Salts (ORS)', mrp: 60.00, category: 'Sachet' },
        { name: 'Cetirizine 10mg', mrp: 10.00, category: 'Tablet' },
        { name: 'Beclomethasone Inhaler', mrp: 650.00, category: 'Inhaler' },
        { name: 'Co-Amoxiclav 625mg', mrp: 95.00, category: 'Tablet' },
        { name: 'Doxycycline 100mg', mrp: 25.00, category: 'Capsule' }
    ];

    let addedCount = 0;

    for (const med of requiredMedicines) {
        const genericKeyword = med.name.split(' ')[0].toLowerCase();
        const exists = await Product.findOne({ name: { $regex: genericKeyword, $options: 'i' } });
        
        if (!exists) {
            const newProduct = await Product.create({
                name: med.name,
                category: med.category,
                description: 'Auto-generated for ML Simulation'
            });

            // Dummy batch with high inventory
            await Batch.create({
                productId: newProduct._id,
                batchNumber: `SIM-${Date.now().toString().slice(-6)}`,
                mrp: med.mrp,
                costPrice: parseFloat((med.mrp * 0.7).toFixed(2)),
                quantity: 5000, 
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
                supplier: 'SPMC Simulation'
            });

            addedCount++;
        }
    }

    if (addedCount > 0) {
        console.log(`✅ Successfully added ${addedCount} missing medicines to the inventory.`);
    } else {
        console.log(`✅ All required simulation medicines are already in the database.`);
    }
}

async function startSimulation() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Live Simulation.');

        // 1. RUN AUTO-SEEDER
        await ensureSimulationProductsExist();

        // Fetch necessary base data
        const cashier = await User.findOne({ role: 'admin' }) || { _id: 'PLACEHOLDER_CASHIER' };
        const customers = await Customer.find().lean();
        const batches = await Batch.find().populate('productId').lean();

        if (batches.length === 0) {
            console.error("No batches found in DB. Please run import_data.js first.");
            process.exit(1);
        }

        // Identify regional outbreak drugs
        const seasonalBatches = batches.filter(b => {
            const productName = (b.productId?.name || '').toLowerCase();
            return activeRegion.topMeds.some(keyword => productName.includes(keyword));
        });

        console.log(`\nConfigured for ${CURRENT_PROVINCE} Province.`);
        console.log(`Identified ${seasonalBatches.length} high-demand seasonal products for this region.`);

        // 2. APPLY PARETO WEIGHTS & NCD BASE-LOAD
        const weightedBatches = batches.map((b, index) => {
            const productName = (b.productId?.name || '').toLowerCase();
            const isChronicNCD = CHRONIC_NCD_MEDS.some(med => productName.includes(med));

            let weight = 0.05; // Slow moving
            const percentile = index / batches.length;
            
            if (isChronicNCD) {
                weight = 0.80; // Force SPMC NCDs to be fast movers
            } else if (percentile < 0.2) {
                weight = 0.60; // Top 20%
            } else if (percentile < 0.5) {
                weight = 0.20; // Next 30%
            }
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

        // 3. Schedule the Cron Job (Runs every 2 minutes)
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
                const isPeakSeason = activeRegion.peakMonths.includes(month);

                for (let j = 0; j < numItems; j++) {
                    let batch = (isPeakSeason && seasonalBatches.length > 0 && Math.random() > 0.4) 
                        ? getRandomElement(seasonalBatches) 
                        : getRandomBatchWithWeight();

                    if (items.some(item => item.productId.toString() === batch.productId._id.toString())) continue;

                    const productName = (batch.productId?.name || '').toLowerCase();
                    const isChronicNCD = CHRONIC_NCD_MEDS.some(med => productName.includes(med));

                    let minQty = 1;
                    let maxQty = 3;

                    // Quantity Logic based on drug type
                    if (isChronicNCD) {
                        const supplyDays = Math.random() > 0.5 ? 30 : 60; // Monthly/Bi-monthly refill
                        minQty = supplyDays; 
                        maxQty = supplyDays + 5; 
                    } else if (isPeakSeason && activeRegion.topMeds.some(med => productName.includes(med))) {
                        minQty = 2; 
                        maxQty = Math.floor(4 * activeRegion.multiplier); // Outbreak bulk buying
                    }

                    const qty = getRandomInt(minQty, maxQty);
                    const price = batch.mrp;
                    const costPrice = batch.costPrice || parseFloat((price * 0.7).toFixed(2));

                    items.push({
                        productId: batch.productId._id,
                        batchId: batch._id,
                        quantity: qty,
                        price: price,
                        costPrice: costPrice
                    });

                    totalAmount += (price * qty);
                }

                if (items.length === 0) return;

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