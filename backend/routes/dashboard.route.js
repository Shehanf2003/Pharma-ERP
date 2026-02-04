import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/stats', protectRoute, getDashboardStats);

export default router;
