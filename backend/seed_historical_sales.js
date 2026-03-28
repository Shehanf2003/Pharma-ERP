import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import Product from './models/Product.js';
import Batch from './models/Batch.js';
import Customer from './models/Customer.js';
import Sale from './models/Sale.js';
import User from './models/User.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Sri Lanka Public & Bank Holidays for 2025 (YYYY-MM-DD)
const SL_HOLIDAYS_2025 = new Set([
    '2025-01-13', // Duruthu Full Moon Poya
    '2025-01-14', // Tamil Thai Pongal Day
    '2025-02-04', // Independence Day
    '2025-02-12', // Navam Full Moon Poya
    '2025-03-13', // Medin Full Moon Poya
    '2025-04-11', // Bak Full Moon Poya
    '2025-04-13', // Day prior to Sinhala & Tamil New Year
    '2025-04-14', // Sinhala & Tamil New Year Day
    '2025-05-01', // May Day
    '2025-05-12', // Vesak Full Moon Poya
    '2025-05-13', // Day following Vesak
    '2025-06-10', // Poson Full Moon Poya
    '2025-07-10', // Esala Full Moon Poya
    '2025-08-08', // Nikini Full Moon Poya
    '2025-09-06', // Binara Full Moon Poya
    '2025-10-06', // Vap Full Moon Poya
    '2025-10-20', // Deepavali
    '2025-11-04', // Ill Full Moon Poya
    '2025-12-04', // Unduvap Full Moon Poya
    '2025-12-25'  // Christmas Day
]);

async function seedHistoricalData() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        // 1. WIPE EXISTING SALES
        console.log('Wiping existing sales data to start fresh...');
        await Sale.deleteMany({});
        console.log('Old sales data cleared!');

        const cashier = await User.findOne({ role: 'admin' }) || { _id: 'PLACEHOLDER_CASHIER' };
        const customers = await Customer.find().lean();
        const batches = await Batch.find().populate('productId').lean();

        if (batches.length === 0) {
            console.error("No batches found. Please populate inventory first.");
            process.exit(1);
        }

        // Western Province Data
        const westernTopMedsKeywords = ['paracetamol', 'ors', 'rehydration', 'salbutamol', 'cetirizine', 'beclomethasone', 'co-amoxiclav'];
        const westernPeakMonths = [5, 6, 9, 10, 11, 0]; // Jun, Jul, Oct, Nov, Dec, Jan
        const seasonalBatches = batches.filter(b => 
            westernTopMedsKeywords.some(keyword => (b.productId?.name || '').toLowerCase().includes(keyword))
        );

        // Pareto Principle Weights
        const weightedBatches = batches.map((b, index) => {
            let weight = 0.05; 
            const percentile = index / batches.length;
            if (percentile < 0.2) weight = 0.70; 
            else if (percentile < 0.5) weight = 0.25; 
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

        // 2. GENERATE EXACTLY 1 YEAR OF DATA (Jan 1, 2025 to Dec 31, 2025)
        const startDate = new Date('2025-01-01T00:00:00Z');
        const endDate = new Date('2025-12-31T23:59:59Z');
        
        console.log('Starting historical data generation (This may take a minute)...');
        
        let currentDate = new Date(startDate);
        let dayCounter = 0;
        let totalSalesInserted = 0;

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const isHoliday = SL_HOLIDAYS_2025.has(dateString);
            
            // Check if tomorrow is a holiday (Panic buying effect)
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowString = tomorrow.toISOString().split('T')[0];
            const isPreHoliday = SL_HOLIDAYS_2025.has(tomorrowString);

            const dayOfWeek = currentDate.getDay(); 
            const month = currentDate.getMonth();

            // --- Multipliers for Prophet to learn ---
            let dailyTrafficMultiplier = 1.0;
            
            // Weekly Seasonality
            if (dayOfWeek === 1) dailyTrafficMultiplier = 1.3; // Monday Rush
            if (dayOfWeek === 0) dailyTrafficMultiplier = 0.6; // Sunday Slow
            
            // Holiday Effect
            if (isHoliday) dailyTrafficMultiplier *= 0.2; // 80% drop in sales on Poya/Holidays
            if (isPreHoliday) dailyTrafficMultiplier *= 1.4; // 40% spike day before holiday

            // Long term trend (Business grows by ~15% over the year)
            const growthTrend = 1 + (dayCounter * 0.0004); 
            
            const baseTransactionsPerDay = getRandomInt(40, 70);
            const actualTransactions = Math.floor(baseTransactionsPerDay * dailyTrafficMultiplier * growthTrend);

            const dailySalesToInsert = [];

            // Generate transactions for the day between 8 AM and 8 PM
            for (let s = 0; s < actualTransactions; s++) {
                const isGuest = Math.random() > 0.6;
                const customer = isGuest ? null : getRandomElement(customers);
                
                const numItems = getRandomInt(1, 4);
                const items = [];
                let totalAmount = 0;
                const isPeakSeason = westernPeakMonths.includes(month);

                for (let j = 0; j < numItems; j++) {
                    let batch = (isPeakSeason && seasonalBatches.length > 0 && Math.random() > 0.4) 
                        ? getRandomElement(seasonalBatches) 
                        : getRandomBatch();

                    if (items.some(item => item.productId.toString() === batch.productId._id.toString())) continue;

                    const productName = (batch.productId?.name || '').toLowerCase();
                    let minQty = 1; let maxQty = 3;

                    // Outbreak multiplier
                    if (isPeakSeason && westernTopMedsKeywords.some(med => productName.includes(med))) {
                        minQty = 3; maxQty = 8;
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

                const receiptNumber = `REC-${saleTime.getFullYear()}${(saleTime.getMonth()+1).toString().padStart(2,'0')}${saleTime.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 900000) + 100000}`;

                dailySalesToInsert.push({
                    receiptNumber,
                    items,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    paymentMethod: getRandomElement(['Cash', 'Card', 'Card', 'Online']),
                    status: 'completed',
                    customerId: customer ? customer._id : null,
                    cashierId: cashier._id,
                    createdAt: saleTime, // Overriding Mongoose timestamps!
                    updatedAt: saleTime
                });
            }

            // Bulk insert for speed
            if (dailySalesToInsert.length > 0) {
                await Sale.insertMany(dailySalesToInsert);
                totalSalesInserted += dailySalesToInsert.length;
            }

            if (dayCounter % 30 === 0) {
                console.log(`Generated up to ${dateString}... (${totalSalesInserted} sales total)`);
            }

            currentDate.setDate(currentDate.getDate() + 1);
            dayCounter++;
        }

        console.log(`\n✅ SUCCESS! Inserted ${totalSalesInserted} realistic historical sales for Prophet ML training.`);
        process.exit(0);

    } catch (error) {
        console.error('Failed to seed historical data:', error);
        process.exit(1);
    }
}

seedHistoricalData();