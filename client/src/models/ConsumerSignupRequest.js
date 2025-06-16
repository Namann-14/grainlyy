import mongoose from 'mongoose';

const ConsumerSignupRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  homeAddress: {
    type: String,
    required: true,
    trim: true
  },
  rationCardId: {
    type: String,
    required: true,
    trim: true
  },
  aadharNumber: {
    type: String,
    required: true,
    trim: true,
    length: 12
  },
  familySize: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Admin ID or name
  }
}, {
  timestamps: true
});

// Index for faster queries
ConsumerSignupRequestSchema.index({ status: 1, submittedAt: -1 });
ConsumerSignupRequestSchema.index({ email: 1 }, { unique: true });
ConsumerSignupRequestSchema.index({ rationCardId: 1 }, { unique: true });

export default mongoose.models.ConsumerSignupRequest || mongoose.model('ConsumerSignupRequest', ConsumerSignupRequestSchema);