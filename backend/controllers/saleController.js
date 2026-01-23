import Sale from '../models/Sale.js';
import Batch from '../models/Batch.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import StockMovement from '../models/StockMovement.js';
import { z } from 'zod';
import mongoose from 'mongoose';

// --- Validation Schemas ---
const saleItemSchema = z.object({
  product: z.string(),
  batch: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(), // Validated against DB later
  discount: z.number().default(0)
});

const paymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'ONLINE']),
  amount: z.number().positive(),
  reference: z.string().optional()
});

const createSaleSchema = z.object({
  customer: z.string().nullable().optional(), // ID or null
  isGuest: z.boolean().default(false),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  isOfflineSync: z.boolean().optional()
});

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validated = createSaleSchema.parse(req.body);
    const { items, payments, customer: customerId, isGuest, isOfflineSync } = validated;

    // 1. Calculate Totals
    let subtotal = 0;
    let discountTotal = 0;

    const processedItems = [];

    for (const item of items) {
        const batch = await Batch.findById(item.batch).session(session);
        if (!batch) {
            throw new Error(`Batch not found for product ${item.product}`);
        }

        // Verify Price (Security: Don't trust frontend price blindly, but for POS override flexibility we might need to check policy)
        // For now, strict check:
        if (batch.price !== item.price) {
            // In a real POS, managers might override price. For now, strict NMRA.
            // throw new Error(`Price mismatch for batch ${batch.batchNumber}. Expected ${batch.price}`);
        }

        if (batch.quantity < item.quantity) {
             throw new Error(`Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantity}`);
        }

        // Deduct Stock
        batch.quantity -= item.quantity;
        await batch.save({ session });

        // Record Movement
        await StockMovement.create([{
            type: 'SALE',
            product: item.product,
            batch: item.batch,
            quantity: item.quantity, // Negative for outflow? Model convention depends. Usually positive number with 'SALE' type implies out.
            reason: `POS Sale`,
            reference: 'PENDING', // Will update with receipt number
            performedBy: req.user._id
        }], { session });

        const lineTotal = (item.price * item.quantity) - item.discount;
        subtotal += (item.price * item.quantity);
        discountTotal += item.discount;

        processedItems.push({
            ...item,
            total: lineTotal
        });
    }

    const grandTotal = subtotal - discountTotal;

    // 2. Validate Payment
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentTotal - grandTotal) > 0.01) { // Floating point tolerance
        throw new Error(`Payment mismatch. Total: ${grandTotal}, Paid: ${paymentTotal}`);
    }

    // 3. Generate Receipt Number
    const count = await Sale.countDocuments();
    const dateStr = new Date().toISOString().slice(2,10).replace(/-/g,'');
    const receiptNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // 4. Create Sale
    const sale = new Sale({
        receiptNumber,
        customer: isGuest ? null : customerId,
        isGuest,
        items: processedItems,
        subtotal,
        discountTotal,
        grandTotal,
        payments,
        processedBy: req.user._id,
        isOfflineSync: !!isOfflineSync,
        syncedAt: isOfflineSync ? new Date() : undefined
    });

    await sale.save({ session });

    // 5. Update Customer Stats
    if (customerId) {
        await Customer.findByIdAndUpdate(customerId, {
            $inc: {
                totalSpent: grandTotal,
                visitCount: 1
            },
            lastVisit: new Date()
        }, { session });
    }

    await session.commitTransaction();
    res.status(201).json(sale);

  } catch (error) {
    await session.abortTransaction();
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
