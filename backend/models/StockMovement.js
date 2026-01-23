import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  type: {
    type: String,
    enum: ['PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'INITIAL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  reason: String,
  referenceId: String, // e.g., PO ID or Sale ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;

