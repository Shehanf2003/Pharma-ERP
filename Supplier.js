import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String, required: true },
  address: { type: String },
  brNumber: { type: String }, // Business Registration Number
  vatNumber: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Supplier', supplierSchema);