import Prescription from '../models/Prescription.js';

export const uploadPrescription = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file uploaded" });
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        // 1. Create initial Prescription record
        const prescription = new Prescription({
            imageUrl: fileUrl,
            extractedData: null,
            isApproved: false
        });
        await prescription.save();

        // 2. Use mock OCR result directly since the OCR service has been removed
        const ocrResult = {
            status: "mock_fallback",
            medications: [
                 { name: "Amoxicillin", strength: "500mg", quantity: 21, frequency: "TDS", timing: "After Meal" },
                 { name: "Panadol", strength: "500mg", quantity: 10, frequency: "PRN", timing: "After Meal" }
            ],
            extracted_text: "Amox 500mg TDS x 7\nPanadol PRN"
        };

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
