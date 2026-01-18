
import express from 'express';
import {
  addProduct,
  addBatch,
  getLowStockAlerts,
  getExpiringBatches,
  getInventory,
  getAllBatches,
  updateBatch,
  deleteBatch,
  transferStock,
  adjustStock,
  getLocations
} from '../controllers/inventory.controller.js';
import { protectRoute, adminRoute } from '../middleware/auth.middleware.js';
import {
    createSupplier,
    getSuppliers,
    updateSupplier,
    deleteSupplier
} from '../controllers/supplier.controller.js';
import {
    createPO,
    getPOs,
    receivePO
} from '../controllers/purchaseOrder.controller.js';

const router = express.Router();

// Existing Routes
router.post('/products', protectRoute, adminRoute, addProduct);
router.post('/batches', protectRoute, adminRoute, addBatch);
router.get('/alerts/low-stock', protectRoute, getLowStockAlerts);
router.get('/alerts/expiring', protectRoute, getExpiringBatches);
router.get('/', protectRoute, getInventory);
router.get('/batches-list', protectRoute, getAllBatches);
router.patch('/batches/:id', protectRoute, adminRoute, updateBatch);
router.delete('/batches/:id', protectRoute, adminRoute, deleteBatch);

// New Routes
// Suppliers
router.post('/suppliers', protectRoute, adminRoute, createSupplier);
router.get('/suppliers', protectRoute, getSuppliers);
router.put('/suppliers/:id', protectRoute, adminRoute, updateSupplier);
router.delete('/suppliers/:id', protectRoute, adminRoute, deleteSupplier);

// Purchase Orders
router.post('/purchase-orders', protectRoute, adminRoute, createPO);
router.get('/purchase-orders', protectRoute, getPOs);
router.post('/purchase-orders/:id/receive', protectRoute, adminRoute, receivePO);

// Inventory Operations
router.post('/transfer', protectRoute, adminRoute, transferStock);
router.post('/adjust', protectRoute, adminRoute, adjustStock);
router.get('/locations', protectRoute, getLocations);

export default router;
