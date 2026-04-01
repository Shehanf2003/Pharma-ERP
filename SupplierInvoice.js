import mongoose from 'mongoose';

const supplierInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true }, // The supplier's physical invoice ID
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  
  // Links the financial invoice to the actual inventory batches received
  receivedBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],

  subTotal: { type: Number, required: true },
  ssclAmount: { type: Number, default: 0 }, // Social Security Contribution Levy
  vatAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }, // subTotal + taxes
  
  amountPaid: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Partially Paid', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('SupplierInvoice', supplierInvoiceSchema);