import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Batch from './models/Batch.js';
import StockMovement from './models/StockMovement.js';

dotenv.config();

// Realistic Sri Lankan Market Prices (LKR)
const slPricingMap = {
    "Panadol 500mg": { cost: 3.50, mrp: 4.00 },
    "Amoxicillin 500mg": { cost: 12.00, mrp: 18.00 },
    "Ventolin Inhaler": { cost: 950.00, mrp: 1250.00 },
    "Losartan 50mg": { cost: 8.00, mrp: 12.00 },
    "Atorvastatin 10mg": { cost: 18.00, mrp: 26.00 },
    "Metformin 500mg": { cost: 4.00, mrp: 6.00 },
    "Celin 500mg": { cost: 3.50, mrp: 5.00 },
    "Piriton 4mg": { cost: 2.00, mrp: 3.50 },
    "Surgical Spirit": { cost: 250.00, mrp: 350.00 }, // Just in case!
    "Omeprazole 20mg": { cost: 10.00, mrp: 15.00 },
    "Thyrox 50mcg": { cost: 4.50, mrp: 7.00 }
};

// Fallback generator for products not in the map
const getRandomPrice = () => {
    const cost = Math.floor(Math.random() * 50) + 10; // Random cost between 10 and 60
    const margin = 1.2 + (Math.random() * 0.3); // 20% to 50% profit margin
    return { cost, mrp: Math.ceil(cost * margin) };
};

const seedHistoricalData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Starting Sri Lankan market data generation...');

    // 1. Clear old movements
    await StockMovement.deleteMany({});
    console.log('Cleared old stock movements.');

    // 2. Fetch all batches and populate product info to get the name
    const batches = await Batch.find().populate('productId');
    if (batches.length === 0) {
      console.log('No batches found.');
      process.exit();
    }

    const movements = [];
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    console.log(`Updating pricing and simulating data for ${batches.length} batches...`);

    for (const batch of batches) {
      if (!batch.productId) continue;

      const productName = batch.productId.name;
      
      // Get exact SL price from map, or generate a realistic fallback
      const pricing = slPricingMap[productName] || getRandomPrice();

      // 3. Update the actual Batch in the database with the new SL pricing
      batch.costPrice = pricing.cost;
      batch.mrp = pricing.mrp;
      await batch.save(); // Save the corrected price to the batch collection

      const primaryLocation = batch.stockDistribution && batch.stockDistribution.length > 0 
        ? batch.stockDistribution[0].location 
        : null;

      // 4. Generate the 'IN' (Initial Receiving) Movement
      const timeSpan = today.getTime() - oneYearAgo.getTime();
      const purchaseDate = new Date(oneYearAgo.getTime() + Math.random() * (timeSpan / 2));
      const startingStock = batch.quantity + Math.floor(Math.random() * 400) + 100;

      movements.push({
        product: batch.productId._id,
        batch: batch._id,
        type: 'INITIAL',
        flow: 'IN',
        quantity: startingStock,
        toLocation: primaryLocation,
        
        // LOCK IN THE PRICE for historical analytics
        unitCost: pricing.cost,
        unitMrp: pricing.mrp,
        
        reason: 'Supplier Delivery (Stock Entry)',
        createdAt: purchaseDate,
        updatedAt: purchaseDate
      });

      // 5. Generate the 'OUT' (Sales) Movements
      let simulatedCurrentStock = startingStock;
      
      while (simulatedCurrentStock > batch.quantity) {
        const saleTimeSpan = today.getTime() - purchaseDate.getTime();
        const saleDate = new Date(purchaseDate.getTime() + (Math.random() * saleTimeSpan));
        let amountSold = Math.floor(Math.random() * 15) + 1;
        
        if (simulatedCurrentStock - amountSold < batch.quantity) {
          amountSold = simulatedCurrentStock - batch.quantity;
        }

        if (amountSold > 0) {
          movements.push({
            product: batch.productId._id,
            batch: batch._id,
            type: 'SALE',
            flow: 'OUT',
            quantity: amountSold,
            toLocation: primaryLocation, 
            
            // LOCK IN THE PRICE for historical analytics
            unitCost: pricing.cost,
            unitMrp: pricing.mrp,
            
            reason: 'Daily POS Sale',
            createdAt: saleDate,
            updatedAt: saleDate
          });
          simulatedCurrentStock -= amountSold;
        }
      }
    }

    // Sort chronologically
    movements.sort((a, b) => a.createdAt - b.createdAt);

    // Bulk insert the locked-in ledger data
    await StockMovement.insertMany(movements);
    
    console.log(`Success! Updated batch prices and generated ${movements.length} realistic stock movements.`);
    process.exit();

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedHistoricalData();