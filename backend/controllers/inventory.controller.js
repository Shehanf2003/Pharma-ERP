import Product from '../models/Product.js';
import Batch from '../models/Batch.js';
import Location from '../models/Location.js';
import StockMovement from '../models/StockMovement.js';
import { z } from 'zod';

const initialBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  mrp: z.number().positive(),
  costPrice: z.number().positive(),
  quantity: z.number().int().nonnegative(),
}).refine((data) => data.expiryDate > new Date(), {
  message: "Expiry date must be in the future",
  path: ["expiryDate"],
}).refine((data) => data.mrp > data.costPrice, {
  message: "MRP must be greater than cost price",
  path: ["mrp"],
});

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  genericName: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  storageCondition: z.enum(['Cold Chain', 'Room Temp', 'Frozen', 'Refrigerated']).optional(),
  minStockLevel: z.coerce.number().min(0).optional(),
  barcode: z.string().optional(),
  taxRate: z.coerce.number().min(0).optional(),
  initialBatch: initialBatchSchema.optional(),
});

const batchSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  mrp: z.number().positive(),
  costPrice: z.number().positive(),
  quantity: z.number().int().nonnegative(),
}).refine((data) => data.expiryDate > new Date(), {
  message: "Expiry date must be in the future",
  path: ["expiryDate"],
}).refine((data) => data.mrp > data.costPrice, {
  message: "MRP must be greater than cost price",
  path: ["mrp"],
});

export const addProduct = async (req, res) => {
  let savedProduct = null;
  try {
    const validatedData = productSchema.parse(req.body);

    // Separate product data from initial batch data
    const { initialBatch, ...productData } = validatedData;

    const product = new Product(productData);
    savedProduct = await product.save();

    if (initialBatch) {
      try {
        const warehouse = await Location.findOne({ type: 'Warehouse' }) || await Location.findOne({});
        const batch = new Batch({
          ...initialBatch,
          productId: savedProduct._id,
          stockDistribution: warehouse ? [{ location: warehouse._id, quantity: initialBatch.quantity }] : []
        });
        await batch.save();

        // Log movement
        if (warehouse) {
             await StockMovement.create({
                product: savedProduct._id,
                batch: batch._id,
                type: 'INITIAL',
                quantity: initialBatch.quantity,
                toLocation: warehouse._id,
                reason: 'Initial Product Creation',
                user: req.user?._id
             });
        }

      } catch (batchError) {
        // Rollback: Delete the product if batch creation fails
        await Product.findByIdAndDelete(savedProduct._id);

        if (batchError.code === 11000) {
           return res.status(400).json({ message: "Batch number must be unique" });
        }
        throw batchError; // Re-throw to be caught by the outer catch block
      }
    }

    res.status(201).json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
       // Check if the error is related to NMRA compliance specific checks in initialBatch
       // Ensure error.errors exists and is an array before filtering
       if (Array.isArray(error.errors)) {
          const nmraErrors = error.errors.filter(e =>
              e.message === "Expiry date must be in the future" ||
              e.message === "MRP must be greater than cost price"
          );
          if (nmraErrors.length > 0) {
              return res.status(400).json({ message: "NMRA Compliance Violation: " + nmraErrors.map(e => e.message).join(", ") });
          }
          return res.status(400).json({ errors: error.errors });
       }
    }
    res.status(500).json({ message: error.message });
  }
};

export const addBatch = async (req, res) => {
  try {
    // Basic check for required fields before Zod to match specific error message requirement
    const { batchNumber, expiryDate, mrp, costPrice } = req.body;
    if (!batchNumber || !expiryDate || mrp === undefined || costPrice === undefined) {
       return res.status(400).json({ message: "NMRA Compliance Violation: Missing Batch Data" });
    }

    // Zod validation
    const validatedData = batchSchema.parse(req.body);

    // Check if product exists
    const product = await Product.findById(validatedData.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Default to Warehouse
    const warehouse = await Location.findOne({ type: 'Warehouse' }) || await Location.findOne({});

    const batch = new Batch({
        ...validatedData,
        stockDistribution: warehouse ? [{ location: warehouse._id, quantity: validatedData.quantity }] : []
    });

    await batch.save();

    if (warehouse) {
        await StockMovement.create({
           product: product._id,
           batch: batch._id,
           type: 'INITIAL',
           quantity: validatedData.quantity,
           toLocation: warehouse._id,
           reason: 'Manual Batch Add',
           user: req.user?._id
        });
   }

    res.status(201).json(batch);
  } catch (error) {
    if (error instanceof z.ZodError) {
        // Check if the error is related to NMRA compliance specific checks
        const nmraErrors = error.errors.filter(e =>
            e.message === "Expiry date must be in the future" ||
            e.message === "MRP must be greater than cost price"
        );
        if (nmraErrors.length > 0) {
             return res.status(400).json({ message: "NMRA Compliance Violation: " + nmraErrors.map(e => e.message).join(", ") });
        }
        return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 11000) {
         return res.status(400).json({ message: "Batch number must be unique" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getLowStockAlerts = async (req, res) => {
  try {
    const products = await Product.find().populate('batches');
    const lowStockProducts = [];

    for (const product of products) {
      const totalQuantity = await Batch.checkLowStock(product._id);
      if (totalQuantity < product.minStockLevel) {
        lowStockProducts.push({
          ...product.toObject(),
          totalQuantity
        });
      }
    }

    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpiringBatches = async (req, res) => {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const batches = await Batch.find({
      expiryDate: {
        $gte: new Date(),
        $lte: ninetyDaysFromNow
      }
    }).populate('productId', 'name genericName');

    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to get all products with their total stock
export const getInventory = async (req, res) => {
    try {
        const products = await Product.find().lean();
        const inventory = await Promise.all(products.map(async (product) => {
            const totalQuantity = await Batch.checkLowStock(product._id);
            // Get the soonest expiry date
            const batches = await Batch.find({ productId: product._id }).sort({ expiryDate: 1 }).limit(1);
            const nextExpiryDate = batches.length > 0 ? batches[0].expiryDate : null;

            return {
                ...product,
                totalStock: totalQuantity,
                nextExpiryDate: nextExpiryDate
            };
        }));
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('productId', 'name genericName barcode')
      .populate('stockDistribution.location', 'name') // Populate location names
      .sort({ expiryDate: 1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ message: "Valid quantity is required" });
    }

    // For legacy update, we just update the first location or "Main Warehouse"
    // Ideally we should use the new transfer/adjust endpoints
    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // Simplistic update for compatibility: Update the first stock location
    if (batch.stockDistribution.length > 0) {
        const diff = quantity - batch.stockDistribution[0].quantity;
        batch.stockDistribution[0].quantity = quantity;

        await StockMovement.create({
            product: batch.productId,
            batch: batch._id,
            type: 'ADJUSTMENT',
            quantity: Math.abs(diff), // log the change
            toLocation: batch.stockDistribution[0].location,
            reason: 'Manual Quantity Override',
            user: req.user?._id
        });

    } else {
         // Should fallback to finding a default location
         const warehouse = await Location.findOne({ type: 'Warehouse' }) || await Location.findOne({});
         if (warehouse) {
             batch.stockDistribution.push({ location: warehouse._id, quantity });

              await StockMovement.create({
                product: batch.productId,
                batch: batch._id,
                type: 'ADJUSTMENT',
                quantity: quantity,
                toLocation: warehouse._id,
                reason: 'Manual Quantity Override (New Loc)',
                user: req.user?._id
            });
         }
    }

    await batch.save();

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByIdAndDelete(id);

    if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
    }

    res.json({ message: "Batch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// NEW: Transfer Stock
const transferSchema = z.object({
    batchId: z.string(),
    fromLocationId: z.string(),
    toLocationId: z.string(),
    quantity: z.number().positive(),
    reason: z.string().optional()
});

export const transferStock = async (req, res) => {
    try {
        const { batchId, fromLocationId, toLocationId, quantity, reason } = transferSchema.parse(req.body);

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: "Batch not found" });

        const sourceStock = batch.stockDistribution.find(s => s.location.toString() === fromLocationId);
        if (!sourceStock || sourceStock.quantity < quantity) {
            return res.status(400).json({ message: "Insufficient stock at source location" });
        }

        // Decrement Source
        sourceStock.quantity -= quantity;

        // Increment Destination
        const destStock = batch.stockDistribution.find(s => s.location.toString() === toLocationId);
        if (destStock) {
            destStock.quantity += quantity;
        } else {
            batch.stockDistribution.push({ location: toLocationId, quantity });
        }

        await batch.save();

        await StockMovement.create({
            product: batch.productId,
            batch: batch._id,
            type: 'TRANSFER',
            quantity,
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            reason,
            user: req.user?._id
        });

        res.json({ message: "Transfer successful", batch });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
        res.status(500).json({ message: error.message });
    }
};

// NEW: Adjust Stock
const adjustSchema = z.object({
    batchId: z.string(),
    locationId: z.string(),
    quantity: z.number().nonnegative(),
    reason: z.string().min(1, 'Reason is required')
});

export const adjustStock = async (req, res) => {
    try {
        const { batchId, locationId, quantity, reason } = adjustSchema.parse(req.body);

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: "Batch not found" });

        const stockEntry = batch.stockDistribution.find(s => s.location.toString() === locationId);

        // Calculate diff
        const currentQty = stockEntry ? stockEntry.quantity : 0;
        const diff = quantity - currentQty;

        if (diff === 0) return res.json({ message: "No change", batch });

        // Update Stock
        if (stockEntry) {
            stockEntry.quantity = quantity;
        } else {
            batch.stockDistribution.push({ location: locationId, quantity });
        }

        await batch.save();

        await StockMovement.create({
            product: batch.productId,
            batch: batch._id,
            type: 'ADJUSTMENT',
            quantity: Math.abs(diff),
            // For adjustment, "from" or "to" depends on if we added or removed.
            // If we added (diff > 0), it's "toLocation".
            // If we removed (diff < 0), it's "fromLocation" ??
            // Or just store "quantity" as signed (+/-)? StockMovement `quantity` is usually absolute.
            // Let's stick to absolute and infer from type? No, Type is ADJUSTMENT.
            // Let's set both for clarity or just "toLocation" as the affected location.
            toLocation: locationId,
            reason: `Manual Adjustment: ${reason} (Diff: ${diff})`,
            user: req.user?._id
        });

        res.json({ message: "Adjustment successful", batch });

    } catch (error) {
         if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
        res.status(500).json({ message: error.message });
    }
};


// NEW: Get Locations
export const getLocations = async (req, res) => {
    try {
        // Seed if empty
        const count = await Location.countDocuments();
        if (count === 0) {
            await Location.create([
                { name: 'Main Warehouse', type: 'Warehouse' },
                { name: 'Pharmacy Store', type: 'Store' }
            ]);
        }

        const locations = await Location.find();
        res.json(locations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
