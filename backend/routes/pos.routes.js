import express from 'express';
import {
  createSale,
  createCustomer,
  getCustomers,
  addPrescription,
  getSalesHistory,
  getPosProducts,
  getPublicSale,
  processReturn
} from '../controllers/pos.controller.js';
import { protectRoute, requireModuleAccess } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/sales/public/:id', getPublicSale);

router.post('/sales', protectRoute, requireModuleAccess('POS'), createSale);
router.get('/sales', protectRoute, requireModuleAccess('POS'), getSalesHistory);
router.post('/sales/:id/return', protectRoute, requireModuleAccess('POS'), processReturn);

router.post('/customers', protectRoute, requireModuleAccess('POS'), createCustomer);
router.get('/customers', protectRoute, requireModuleAccess('POS'), getCustomers);

router.post('/prescriptions', protectRoute, requireModuleAccess('POS'), addPrescription);

router.get('/products', protectRoute, requireModuleAccess('POS'), getPosProducts);

export default router;
