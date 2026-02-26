import Prescription from '../models/Prescription.js';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

// OCR Service URL (Python Microservice)
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8000/api/parse';

export const uploadPrescription = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file uploaded" });
        }

        const filePath = req.file.path;
        const fileUrl = `/uploads/${req.file.filename}`;

        // 1. Create initial Prescription record
        const prescription = new Prescription({
            imageUrl: fileUrl,
            extractedData: null,
            isApproved: false
        });
        await prescription.save();

        // 2. Call Python OCR Service
        let ocrResult = null;
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            const response = await axios.post(OCR_SERVICE_URL, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 10000 // 10s timeout
            });

            ocrResult = response.data;
        } catch (ocrError) {
            console.error("OCR Service Failed:", ocrError.message);
            // Fallback for development if Python service is not running
            // This ensures the frontend flow can still be tested
            ocrResult = {
                status: "mock_fallback",
                medications: [
                     { name: "Amoxicillin", strength: "500mg", quantity: 21, frequency: "TDS", timing: "After Meal" },
                     { name: "Panadol", strength: "500mg", quantity: 10, frequency: "PRN", timing: "After Meal" }
                ],
                extracted_text: "Amox 500mg TDS x 7\nPanadol PRN"
            };
        }

        // 3. Update Prescription with OCR data
        prescription.extractedData = ocrResult;
        await prescription.save();

        res.json(prescription);

    } catch (error) {
        console.error("Prescription upload error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getPrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await Prescription.findById(id);
        if (!prescription) return res.status(404).json({ message: "Prescription not found" });
        res.json(prescription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // e.g., patientName, doctorName, isApproved

        const prescription = await Prescription.findByIdAndUpdate(id, updates, { new: true });
        if (!prescription) return res.status(404).json({ message: "Prescription not found" });

        res.json(prescription);
    } catch (error) {
         res.status(500).json({ message: error.message });
    }
};
