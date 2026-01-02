import express from 'express';
import {
  addProduct,
  addBatch,
  getLowStockAlerts,
  getExpiringBatches,
  getInventory
} from '../controllers/inventory.controller.js';
import { protectRoute, requireModuleAccess } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes need protection and authorization
// Adjusting based on existing middleware

router.post('/products', protectRoute, requireModuleAccess('INVENTORY'), addProduct);
router.post('/batches', protectRoute, requireModuleAccess('INVENTORY'), addBatch);
router.get('/alerts/low-stock', protectRoute, requireModuleAccess('INVENTORY'), getLowStockAlerts);
router.get('/alerts/expiring', protectRoute, requireModuleAccess('INVENTORY'), getExpiringBatches);
router.get('/', protectRoute, requireModuleAccess('INVENTORY'), getInventory);

export default router;
