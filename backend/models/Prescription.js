import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true,
  },
  doctorName: {
    type: String,
    required: true,
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
  },
  notes: {
    type: String,
  }
}, {
  timestamps: true
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
