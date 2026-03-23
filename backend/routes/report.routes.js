import express from 'express';
import { getFmcgAnalysis, getDemandForecast } from '../controllers/report.controller.js';
// import { protect } from '../middleware/auth.middleware.js'; // Uncomment if you have standard auth

const router = express.Router();

// Apply authentication middleware here if needed
// router.use(protect);

router.get('/ml/fmcg', getFmcgAnalysis);
router.get('/ml/forecast/:id', getDemandForecast);

export default router;