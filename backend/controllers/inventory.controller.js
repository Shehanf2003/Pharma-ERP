import Product from '../models/Product.js';
import Batch from '../models/Batch.js';
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
        const batch = new Batch({
          ...initialBatch,
          productId: savedProduct._id
        });
        await batch.save();
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

    const batch = new Batch(validatedData);
    await batch.save();
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
      .populate('productId', 'name genericName')
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

    const batch = await Batch.findByIdAndUpdate(
        id,
        { quantity },
        { new: true }
    );

    if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
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

    res.json({ message: "Batch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};