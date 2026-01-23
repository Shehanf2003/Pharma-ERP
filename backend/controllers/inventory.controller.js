import Product from '../models/Product.js';
import Batch from '../models/Batch.js';
import Location from '../models/Location.js';
import StockMovement from '../models/StockMovement.js';
import User from '../models/User.js';
import { sendLowStockAlert } from '../services/notification.service.js';
import { z } from 'zod';

// Helper to check and notify
const notifyIfLowStock = async (productId, locationId) => {
    try {
        const product = await Product.findById(productId);
        if (!product || product.minStockLevel === undefined) return;

        const totalQuantity = await Batch.checkLowStock(productId);

        if (totalQuantity <= product.minStockLevel) {
            // Find users to notify: Admins + Employees with INVENTORY module
            const users = await User.find({
                $or: [
                    { role: 'admin' },
                    { allowedModules: 'INVENTORY' }
                ]
            });

            // Get location name for context
            let locationName = "Unknown Location";
            if (locationId) {
                const loc = await Location.findById(locationId);
                if (loc) locationName = loc.name;
            }

            await sendLowStockAlert(users, product, locationName, totalQuantity);
        }
    } catch (error) {
        console.error("Error triggering low stock alert:", error);
    }
};

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
    const products = await Product.find({ isDeleted: { $ne: true } }).populate('batches');
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
    }).populate({
        path: 'productId',
        select: 'name genericName',
        match: { isDeleted: { $ne: true } }
    });

    const activeBatches = batches.filter(batch => batch.productId !== null);

    res.json(activeBatches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to get all products with their total stock
export const getInventory = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: { $ne: true } }).lean();
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

const deleteProductSchema = z.object({
    reason: z.string().min(1, "Reason is required for deletion")
});

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = deleteProductSchema.parse(req.body);

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Soft Delete
        product.isDeleted = true;
        product.deletionReason = reason;
        product.deletedBy = req.user?._id;
        product.deletedAt = new Date();
        await product.save();

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
        res.status(500).json({ message: error.message });
    }
};

export const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('productId', 'name genericName')
      .sort({ expiryDate: 1 });

    const activeBatches = batches.filter(batch => batch.productId !== null);

    res.json(activeBatches);
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
    let locationId = null;
    if (batch.stockDistribution.length > 0) {
        const diff = quantity - batch.stockDistribution[0].quantity;
        batch.stockDistribution[0].quantity = quantity;
        locationId = batch.stockDistribution[0].location;

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
             locationId = warehouse._id;

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

    // Check for low stock
    if (locationId) {
        await notifyIfLowStock(batch.productId, locationId);
    }

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

    // Check stock after deletion (Total stock dropped)
    await notifyIfLowStock(batch.productId, null); // location unknown since deleted

    res.json({ message: "Batch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};