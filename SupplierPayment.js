import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema({
  paymentReference: { type: String, required: true }, // e.g., Cheque number, Bank Tx ID
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierInvoice', required: true },
  
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Credit Note'],
    required: true
  },
  
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('SupplierPayment', supplierPaymentSchema);