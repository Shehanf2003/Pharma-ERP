// routes/sales.routes.js
import express from 'express';
import { getSalesDashboard } from '../controllers/sales.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js'; // Adjust path if needed

const router = express.Router();

router.get('/dashboard', protectRoute, getSalesDashboard);

export default router;