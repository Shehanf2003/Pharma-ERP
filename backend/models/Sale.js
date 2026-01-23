import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: { // Unit price at time of sale (MRP)
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'ONLINE'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reference: { // Last 4 digits, Transaction ID, etc.
    type: String
  }
});

const saleSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null // Null implies Guest
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    default: null
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  payments: [paymentSchema], // Supports mixed payments
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PARTIAL', 'PENDING', 'REFUNDED'],
    default: 'PAID'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'RETURNED', 'CANCELLED'],
    default: 'COMPLETED'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isOfflineSync: {
    type: Boolean,
    default: false
  },
  syncedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
