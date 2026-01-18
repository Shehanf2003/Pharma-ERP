import PurchaseOrder from '../models/PurchaseOrder.js';
import Batch from '../models/Batch.js';
import StockMovement from '../models/StockMovement.js';
import Location from '../models/Location.js';
import { z } from 'zod';

const itemSchema = z.object({
  product: z.string(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative()
});

const poSchema = z.object({
  supplier: z.string(),
  items: z.array(itemSchema).min(1),
  expectedDeliveryDate: z.string().or(z.date()).optional().transform(val => val ? new Date(val) : undefined),
  notes: z.string().optional()
});

export const createPO = async (req, res) => {
  try {
    const validatedData = poSchema.parse(req.body);

    // Calculate total cost
    const totalCost = validatedData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // Generate PO Number (Simple timestamp based for now)
    const poNumber = 'PO-' + Date.now();

    const po = new PurchaseOrder({
      ...validatedData,
      poNumber,
      totalCost,
      status: 'ORDERED', // Skipping DRAFT for simplicity in this iteration
      createdBy: req.user?._id
    });

    await po.save();
    res.status(201).json(po);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('supplier', 'name')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });
    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Receive Schema: List of items with batch details
const receiveItemSchema = z.object({
  productId: z.string(),
  quantityReceived: z.number().positive(),
  batchNumber: z.string().min(1),
  expiryDate: z.string().or(z.date()).transform(val => new Date(val)),
  mrp: z.number().positive()
});

const receiveSchema = z.object({
  receivedItems: z.array(receiveItemSchema)
});

export const receivePO = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = receiveSchema.parse(req.body);

    const po = await PurchaseOrder.findById(id);
    if (!po) return res.status(404).json({ message: "PO not found" });
    if (po.status === 'RECEIVED') return res.status(400).json({ message: "PO already received" });

    // Find default Warehouse location
    const warehouse = await Location.findOne({ type: 'Warehouse' }) || await Location.findOne({});
    if (!warehouse) return res.status(500).json({ message: "No warehouse location defined" });

    // Process each received item
    for (const item of validatedData.receivedItems) {
      // Create Batch
      // Find unit cost from PO (simplification: assume 1st match for product)
      const poItem = po.items.find(i => i.product.toString() === item.productId);
      const costPrice = poItem ? poItem.unitCost : 0;

      const batch = new Batch({
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        mrp: item.mrp,
        costPrice: costPrice,
        stockDistribution: [{
          location: warehouse._id,
          quantity: item.quantityReceived
        }]
        // quantity will be auto-set by pre-save hook
      });

      await batch.save();

      // Log Movement
      await StockMovement.create({
        product: item.productId,
        batch: batch._id,
        type: 'PURCHASE',
        quantity: item.quantityReceived,
        toLocation: warehouse._id,
        reason: `PO Receive: ${po.poNumber}`,
        referenceId: po._id,
        user: req.user?._id
      });

      // Update PO item received qty (optional partial logic, but keeping simple)
    }

    po.status = 'RECEIVED';
    po.receivedDate = new Date();
    await po.save();

    res.json({ message: "PO Received successfully", po });

  } catch (error) {
    console.error("Receive PO Error:", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    // Handle duplicate batch error
    if (error.code === 11000) {
        return res.status(400).json({ message: "Batch number already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};