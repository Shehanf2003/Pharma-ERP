import express from 'express';
import { protectRoute } from '../middleware/authMiddleware.js';
import { createSale } from '../controllers/saleController.js';
import { createCustomer, getCustomers } from '../controllers/customerController.js';

const router = express.Router();

// Customers
router.get('/customers', protectRoute, getCustomers);
router.post('/customers', protectRoute, createCustomer);

// Sales
router.post('/sales', protectRoute, createSale);

export default router;
