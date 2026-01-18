import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true, // e.g., 'DELETE_PRODUCT', 'UPDATE_USER'
  },
  entity: {
    type: String, // e.g., 'Product', 'User'
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Snapshot of data or diff
  },
  reason: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
