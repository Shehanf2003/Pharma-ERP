
import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  returnedQuantity: {
    type: Number,
    default: 0
  },
  dosageInstructions: {
    patientName: { type: String, default: '' },
    amount: { type: String, default: '1' },
    unit: { type: String, default: 'TABLET' },
    frequency: { type: String, default: 'In the morning' },
    timing: { type: String, default: 'AFTER MEALS' }
  }
});

const saleSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Online'],
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  status: {
    type: String,
    enum: ['completed', 'returned'],
    default: 'completed'
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
