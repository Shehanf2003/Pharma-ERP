import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  patientName: {
    type: String,
    // Made optional for initial upload
  },
  doctorName: {
    type: String,
    // Made optional for initial upload
  },
  doctorRegNo: {
    type: String,
  },
  prescriptionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  imageUrl: {
    type: String,
    required: true
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed, // Stores JSON from OCR
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
  }
}, {
  timestamps: true
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
