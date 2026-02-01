
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Prescription from '../models/Prescription.js';
import Batch from '../models/Batch.js';
import Product from '../models/Product.js';
import { sendBillNotification } from '../services/notification.service.js';
import { z } from 'zod';

const saleItemSchema = z.object({
  productId: z.string(),
  batchId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  discount: z.number().default(0)
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  paymentMethod: z.enum(['Cash', 'Card', 'Online']),
  customerId: z.string().optional(),
  prescriptionId: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

const prescriptionSchema = z.object({
  patientName: z.string().min(1),
  doctorName: z.string().min(1),
  doctorRegNo: z.string().optional(),
  notes: z.string().optional(),
});

export const createSale = async (req, res) => {
  try {
    const validatedData = saleSchema.parse(req.body);

    let totalAmount = 0;
    const processedItems = [];

    // Verify stock and prices
    for (const item of validatedData.items) {
      const batch = await Batch.findById(item.batchId);
      if (!batch) {
        return res.status(404).json({ message: `Batch not found for product ${item.productId}` });
      }

      if (batch.productId.toString() !== item.productId) {
        return res.status(400).json({ message: `Batch ${batch.batchNumber} does not belong to product ${item.productId}` });
      }

      if (batch.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantity}` });
      }

      // NMRA Enforcement: Price cannot exceed MRP
      if (item.price > batch.mrp) {
        return res.status(400).json({ message: `Price for batch ${batch.batchNumber} cannot exceed MRP (${batch.mrp})` });
      }

      totalAmount += (item.price * item.quantity) - item.discount;
      processedItems.push(item);
    }

    // Process Updates (Optimistic locking or simple decrement since we are in single instance mostly)
    // Note: In a real distributed system, we'd use transactions.
    for (const item of processedItems) {
      await Batch.findByIdAndUpdate(item.batchId, {
        $inc: { quantity: -item.quantity }
      });
    }

    const sale = new Sale({
      receiptNumber: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      items: processedItems,
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      customerId: validatedData.customerId,
      prescriptionId: validatedData.prescriptionId,
      contactEmail: validatedData.contactEmail,
      contactPhone: validatedData.contactPhone,
      cashierId: req.user?._id // Assuming middleware populates req.user
    });

    await sale.save();

    // Update Customer Loyalty (Simple: 1 point per 100 units of currency)
    let customerEmail = validatedData.contactEmail;
    let customerPhone = validatedData.contactPhone;

    if (validatedData.customerId) {
        const points = Math.floor(totalAmount / 100);
        const customer = await Customer.findByIdAndUpdate(validatedData.customerId, {
            $inc: { loyaltyPoints: points }
        }, { new: true });

        // Use customer details if provided in profile and not overridden
        if (customer) {
            if (!customerEmail && customer.email) customerEmail = customer.email;
            if (!customerPhone && customer.phoneNumber) customerPhone = customer.phoneNumber;
        }
    }

    // Send Notification
    if (customerEmail || customerPhone) {
        // Run in background, don't await for response
        sendBillNotification({ email: customerEmail, phone: customerPhone }, sale).catch(err => {
            console.error("Failed to send bill notification:", err);
        });
    }

    res.status(201).json(sale);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const validatedData = customerSchema.parse(req.body);
    const customer = new Customer(validatedData);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 11000) {
        return res.status(400).json({ message: "Phone number already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPrescription = async (req, res) => {
    try {
        const validatedData = prescriptionSchema.parse(req.body);
        // Handle file upload if imageUrl is present?
        // For now, assuming imageUrl is just a string or handled elsewhere,
        // or we just store metadata.

        const prescription = new Prescription(validatedData);
        await prescription.save();
        res.status(201).json(prescription);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getPosProducts = async (req, res) => {
    try {
        // Fetch all products with their active batches (quantity > 0)
        // This is optimized for offline caching
        const products = await Product.find({ isDeleted: { $ne: true } }).lean();

        const posData = await Promise.all(products.map(async (product) => {
            const batches = await Batch.find({
                productId: product._id,
                quantity: { $gt: 0 },
                expiryDate: { $gt: new Date() } // active batches only
            }).select('batchNumber expiryDate mrp quantity');

            if (batches.length === 0) return null;

            return {
                _id: product._id,
                name: product.name,
                genericName: product.genericName,
                category: product.category,
                barcode: product.barcode,
                batches: batches
            };
        }));

        // Filter out products with no stock
        res.json(posData.filter(p => p !== null));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSalesHistory = async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('customerId', 'name')
            .populate('items.productId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPublicSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sale.findById(id)
            .populate('items.productId', 'name genericName')
            .populate('customerId', 'name')
            .populate('cashierId', 'name'); // Assuming we want cashier name

        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
