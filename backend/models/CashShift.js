import mongoose from 'mongoose';

const cashShiftSchema = new mongoose.Schema({
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  openingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  closingBalance: {
    type: Number
    // Input by cashier at end of shift
  },
  systemCalculatedSales: {
    type: Number,
    default: 0
    // Total cash sales tracked by system during this shift
  },
  actualCashAmount: {
    type: Number
    // Final count (can include opening balance or just sales + opening)
    // Usually: Opening + Sales = Expected. Actual = What's in drawer.
  },
  discrepancy: {
    type: Number
    // Actual - (Opening + SystemSales)
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  },
  notes: String
}, {
  timestamps: true
});

const CashShift = mongoose.model('CashShift', cashShiftSchema);

export default CashShift;
