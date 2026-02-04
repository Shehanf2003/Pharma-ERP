import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'],
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  referenceNumber: {
    type: String, // e.g., Cheque Number, Transaction ID
    trim: true
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);

export default SupplierPayment;
