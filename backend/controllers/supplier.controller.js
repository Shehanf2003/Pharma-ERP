import Supplier from '../models/Supplier.js';
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
