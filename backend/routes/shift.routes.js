import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
    startShift,
    endShift,
    getCurrentShift,
    getShiftHistory
} from '../controllers/shift.controller.js';

const router = express.Router();

router.get('/current', protectRoute, getCurrentShift);
router.post('/start', protectRoute, startShift);
router.post('/end', protectRoute, endShift);
router.get('/history', protectRoute, getShiftHistory);

export default router;
