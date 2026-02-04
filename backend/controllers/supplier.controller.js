import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import SupplierPayment from '../models/SupplierPayment.js';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional()
});

export const createSupplier = async (req, res) => {
  try {
    const validatedData = supplierSchema.parse(req.body);
    const supplier = new Supplier(validatedData);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Supplier name must be unique" });
    }
    res.status(500).json({ message: error.message });
  }
};

// --- Accounts Payable Logic ---

export const getPayables = async (req, res) => {
  try {
    // Find POs that are NOT 'PAID' (i.e. UNPAID or PARTIAL) and are not CANCELLED/DRAFT
    const payables = await PurchaseOrder.find({
      status: { $in: ['ORDERED', 'RECEIVED'] }, // Only active orders
      paymentStatus: { $ne: 'PAID' }
    })
    .populate('supplier', 'name contactPerson')
    .sort({ createdAt: 1 }); // Oldest first

    res.json(payables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const paymentSchema = z.object({
    purchaseOrderId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    date: z.string().optional() // ISO string
});

export const recordPayment = async (req, res) => {
    try {
        const validated = paymentSchema.parse(req.body);

        const po = await PurchaseOrder.findById(validated.purchaseOrderId);
        if (!po) return res.status(404).json({ message: "Purchase Order not found" });

        const remainingBalance = po.totalCost - (po.paidAmount || 0);

        if (validated.amount > remainingBalance) {
            return res.status(400).json({ message: `Payment amount exceeds remaining balance (${remainingBalance})` });
        }

        const payment = new SupplierPayment({
            supplier: po.supplier,
            purchaseOrder: po._id,
            amount: validated.amount,
            paymentMethod: validated.paymentMethod,
            referenceNumber: validated.referenceNumber,
            notes: validated.notes,
            paymentDate: validated.date || Date.now(),
            createdBy: req.user?._id
        });

        await payment.save();

        // Update PO
        po.paidAmount = (po.paidAmount || 0) + validated.amount;

        if (po.paidAmount >= po.totalCost - 0.01) { // Float tolerance
            po.paymentStatus = 'PAID';
        } else {
            po.paymentStatus = 'PARTIAL';
        }

        await po.save();

        res.status(201).json(payment);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierPayments = async (req, res) => {
    try {
        const { supplierId } = req.query;
        let query = {};
        if (supplierId) query.supplier = supplierId;

        const payments = await SupplierPayment.find(query)
            .populate('supplier', 'name')
            .populate('purchaseOrder', 'poNumber')
            .sort({ paymentDate: -1 })
            .limit(50);

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const validatedData = supplierSchema.parse(req.body);
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};