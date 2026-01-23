import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false // Can be guest
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorRegNo: {
    type: String,
    trim: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientAge: {
    type: Number
  },
  prescriptionDate: {
    type: Date,
    required: true
  },
  imagePaths: [{
    type: String // URL/Path to stored image
  }],
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSED', 'REJECTED'],
    default: 'PENDING'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
