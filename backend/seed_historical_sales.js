import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Import Models
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

// --- HOLIDAYS & SEASONALITY DATA ---
// Sri Lanka Public & Bank Holidays (2025 & early 2026 for 1-year rolling backfill)
const SL_HOLIDAYS = new Set([
    '2025-01-13', '2025-01-14', '2025-02-04', '2025-02-12', '2025-03-13', 
    '2025-04-11', '2025-04-13', '2025-04-14', '2025-05-01', '2025-05-12', 
    '2025-05-13', '2025-06-10', '2025-07-10', '2025-08-08', '2025-09-06', 
    '2025-10-06', '2025-10-20', '2025-11-04', '2025-12-04', '2025-12-25',
    '2026-01-02', '2026-01-14', '2026-02-04', '2026-03-03'
]);

// Months in JS: 0=Jan, 1=Feb, ..., 11=Dec
const REGIONAL_DATA = {
    "Western": { peakMonths: [5, 6, 9, 10, 11, 0], topMeds: ['paracetamol', 'ors', 'salbutamol', 'cetirizine', 'beclomethasone', 'co-amoxiclav'], multiplier: 2.0 }
};

// SPMC High-Volume Staples (Year-round fast movers)
const CHRONIC_NCD_MEDS = [
    'gliclazide', 'atorvastatin', 'prednisolone', 'losartan', 
    'salbutamol', 'levothyroxine', 'enalapril', 'diltiazem', 'metformin'
];

// 📍 SET YOUR SIMULATED PHARMACY LOCATION HERE:
const CURRENT_PROVINCE = "Western"; 
const activeRegion = REGIONAL_DATA[CURRENT_PROVINCE];

// --- AUTO-SEEDER: Ensure required ML medicines exist ---
async function ensureSimulationProductsExist() {
    console.log("Checking for required ML simulation medicines...");

    const requiredMedicines = [
        // Chronic NCDs
        { name: 'Gliclazide 80mg', cost: 12.00, mrp: 18.00, category: 'Tablet' },
        { name: 'Atorvastatin 10mg', cost: 20.00, mrp: 35.00, category: 'Tablet' },
        { name: 'Prednisolone 5mg', cost: 5.00, mrp: 8.00, category: 'Tablet' },
        { name: 'Losartan 50mg', cost: 15.00, mrp: 25.00, category: 'Tablet' },
        { name: 'Levothyroxine 50mcg', cost: 8.00, mrp: 12.00, category: 'Tablet' },
        { name: 'Enalapril 5mg', cost: 10.00, mrp: 15.00, category: 'Tablet' },
        { name: 'Metformin 500mg', cost: 10.00, mrp: 15.00, category: 'Tablet' },
        { name: 'Diltiazem 30mg', cost: 18.00, mrp: 28.00, category: 'Tablet' },
        // Regional/Seasonal
        { name: 'Salbutamol Inhaler 100mcg', cost: 350.00, mrp: 550.00, category: 'Inhaler' },
        { name: 'Oral Rehydration Salts (ORS)', cost: 40.00, mrp: 60.00, category: 'Sachet' },
        { name: 'Cetirizine 10mg', cost: 6.00, mrp: 10.00, category: 'Tablet' },
        { name: 'Beclomethasone Inhaler', cost: 400.00, mrp: 650.00, category: 'Inhaler' },
        { name: 'Co-Amoxiclav 625mg', cost: 60.00, mrp: 95.00, category: 'Tablet' },
        { name: 'Doxycycline 100mg', cost: 15.00, mrp: 25.00, category: 'Capsule' }
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

            // Dummy batch with high inventory (will not affect your live app logic since this script doesn't deduct from it)
            await Batch.create({
                productId: newProduct._id,
                batchNumber: `SIM-${Date.now().toString().slice(-6)}`,
                costPrice: med.cost,
                mrp: med.mrp,
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

// --- MAIN SIMULATION SCRIPT ---
async function seedHistoricalData() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        // 1. WIPE EXISTING SALES (Fresh Slate for ML)
        console.log('Wiping existing sales data to start fresh...');
        await Sale.deleteMany({});
        console.log('Old sales data cleared!');

        // 2. RUN AUTO-SEEDER
        await ensureSimulationProductsExist();

        const cashier = await User.findOne({ role: 'admin' }) || { _id: 'PLACEHOLDER_CASHIER' };
        const customers = await Customer.find().lean();
        const batches = await Batch.find().populate('productId').lean();

        if (batches.length === 0) {
            console.error("No batches found. Please populate inventory first.");
            process.exit(1);
        }

        // Identify regional outbreak drugs
        const seasonalBatches = batches.filter(b => {
            const productName = (b.productId?.name || '').toLowerCase();
            return activeRegion.topMeds.some(keyword => productName.includes(keyword));
        });

        console.log(`\nConfigured for ${CURRENT_PROVINCE} Province.`);
        console.log(`Identified ${seasonalBatches.length} high-demand seasonal products for this region.`);

        // 3. APPLY PARETO WEIGHTS & NCD BASE-LOAD
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

        function getRandomBatch() {
            const random = Math.random() * totalBatchWeight;
            let cumulativeWeight = 0;
            for (const batch of weightedBatches) {
                cumulativeWeight += batch.weight;
                if (random <= cumulativeWeight) return batch;
            }
            return weightedBatches[weightedBatches.length - 1];
        }

        // 4. GENERATE 1 YEAR OF DATA ENDING TODAY
        const endDate = new Date(); 
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1); 
        
        console.log(`\nGenerating realistic sales data from ${startDate.toDateString()} to ${endDate.toDateString()}...`);
        
        let currentDate = new Date(startDate);
        let dayCounter = 0;
        let totalSalesInserted = 0;
        let receiptSequence = 100000;

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const isHoliday = SL_HOLIDAYS.has(dateString);
            
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isPreHoliday = SL_HOLIDAYS.has(tomorrow.toISOString().split('T')[0]);

            const dayOfWeek = currentDate.getDay(); 
            const month = currentDate.getMonth();

            // Prophet Trends & Seasonality
            let dailyTrafficMultiplier = 1.0;
            if (dayOfWeek === 1) dailyTrafficMultiplier = 1.3; // Monday Rush
            if (dayOfWeek === 0) dailyTrafficMultiplier = 0.6; // Sunday Slow
            if (isHoliday) dailyTrafficMultiplier *= 0.2;      // Holiday drop
            if (isPreHoliday) dailyTrafficMultiplier *= 1.4;   // Pre-holiday panic buying

            // Gentle upward trajectory representing business growth
            const growthTrend = 1 + (dayCounter * 0.0004); 
            
            const baseTransactionsPerDay = getRandomInt(40, 70);
            const actualTransactions = Math.floor(baseTransactionsPerDay * dailyTrafficMultiplier * growthTrend);

            const dailySalesToInsert = [];

            for (let s = 0; s < actualTransactions; s++) {
                const isGuest = Math.random() > 0.6;
                const customer = isGuest ? null : getRandomElement(customers);
                
                const numItems = getRandomInt(1, 4);
                const items = [];
                let totalAmount = 0;
                const isPeakSeason = activeRegion.peakMonths.includes(month);

                for (let j = 0; j < numItems; j++) {
                    let batch = (isPeakSeason && seasonalBatches.length > 0 && Math.random() > 0.4) 
                        ? getRandomElement(seasonalBatches) 
                        : getRandomBatch();

                    if (items.some(item => item.productId.toString() === batch.productId._id.toString())) continue;

                    const productName = (batch.productId?.name || '').toLowerCase();
                    const isChronicNCD = CHRONIC_NCD_MEDS.some(med => productName.includes(med));
                    
                    let minQty = 1; let maxQty = 3;

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
                    items.push({
                        productId: batch.productId._id,
                        batchId: batch._id,
                        quantity: qty,
                        price: batch.mrp,
                        costPrice: batch.costPrice
                    });
                    totalAmount += (batch.mrp * qty);
                }

                if (items.length === 0) continue;

                // Randomize time between 08:00 and 19:59
                const saleTime = new Date(currentDate);
                saleTime.setHours(getRandomInt(8, 19), getRandomInt(0, 59), getRandomInt(0, 59));

                const receiptNumber = `REC-${saleTime.getFullYear()}${(saleTime.getMonth()+1).toString().padStart(2,'0')}${saleTime.getDate().toString().padStart(2,'0')}-${receiptSequence++}`;

                dailySalesToInsert.push({
                    receiptNumber,
                    items,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    paymentMethod: getRandomElement(['Cash', 'Card', 'Card', 'Online']),
                    status: 'completed',
                    customerId: customer ? customer._id : null,
                    cashierId: cashier._id,
                    createdAt: saleTime, // Override timestamps!
                    updatedAt: saleTime
                });
            }

            if (dailySalesToInsert.length > 0) {
                await Sale.insertMany(dailySalesToInsert);
                totalSalesInserted += dailySalesToInsert.length;
            }

            currentDate.setDate(currentDate.getDate() + 1);
            dayCounter++;
        }

        console.log(`\n✅ SUCCESS! Inserted ${totalSalesInserted} realistic historical sales.`);
        console.log(`Your ML Models are now ready to be tested!`);
        process.exit(0);

    } catch (error) {
        console.error('Failed to seed historical data:', error);
        process.exit(1);
    }
}

seedHistoricalData();