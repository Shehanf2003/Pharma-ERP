import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Warehouse', 'Store', 'Dispensary', 'Other'],
    default: 'Store'
  },
  address: String,
  description: String
}, {
  timestamps: true
});

const Location = mongoose.model('Location', locationSchema);

export default Location;