import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { initiatePayment, verifyPayment } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/initiate', protectRoute, initiatePayment);
router.post('/verify', protectRoute, verifyPayment);

export default router;
