import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadPrescription, getPrescription, updatePrescription } from '../controllers/prescription.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Routes
// Note: We're not explicitly requiring 'POS' module access here for simplicity,
// but in production we should. 'protectRoute' handles basic auth.

router.post('/upload', protectRoute, upload.single('image'), uploadPrescription);
router.get('/:id', protectRoute, getPrescription);
router.put('/:id', protectRoute, updatePrescription);

export default router;
