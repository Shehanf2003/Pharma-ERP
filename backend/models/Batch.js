import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchNumber: {
    type: String,
    required: true,
    unique: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  mrp: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

batchSchema.statics.checkLowStock = async function(productId) {
  const batches = await this.find({ productId });
  const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  return totalQuantity;
};

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
