import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  genericName: {
    type: String,
  },
  category: {
    type: String,
  },
  manufacturer: {
    type: String,
  },
  storageCondition: {
    type: String,
    enum: ['Cold Chain', 'Room Temp', 'Frozen', 'Refrigerated'],
    default: 'Room Temp'
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values to exist without violating uniqueness
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    required: true,
    default: 10
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('batches', {
  ref: 'Batch',
  localField: '_id',
  foreignField: 'productId'
});

const Product = mongoose.model('Product', productSchema);

export default Product;
