import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DeliverySignupRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['bicycle', 'motorcycle', 'car', 'van', 'truck'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  pin: {
    type: String,
    required: true
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

// Hash PIN before saving
DeliverySignupRequestSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare PIN
DeliverySignupRequestSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Index for faster queries
DeliverySignupRequestSchema.index({ status: 1, submittedAt: -1 });
DeliverySignupRequestSchema.index({ phone: 1 }, { unique: true });
DeliverySignupRequestSchema.index({ licenseNumber: 1 }, { unique: true });

export default mongoose.models.DeliverySignupRequest || mongoose.model('DeliverySignupRequest', DeliverySignupRequestSchema);