import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema({
  pickupId: {
    type: String,
    required: true,
    index: true
  },
  deliveryAgentAddress: {
    type: String,
    required: true,
    index: true
  },
  shopkeeperAddress: {
    type: String,
    required: true,
    index: true
  },
  otpCode: {
    type: String,
    required: true,
    length: 6
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  deliveryLocation: {
    type: String,
    required: false
  },
  rationAmount: {
    type: Number,
    required: false
  },
  category: {
    type: String,
    required: false
  }
});

// Create TTL index that expires documents after 5 minutes (300 seconds)
OTPSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 300 });

// Compound index for efficient queries
OTPSchema.index({ pickupId: 1, deliveryAgentAddress: 1, isUsed: 1 });
OTPSchema.index({ pickupId: 1, shopkeeperAddress: 1, isUsed: 1 });

// Static method to generate OTP
OTPSchema.statics.generateOTP = function(pickupId, deliveryAgentAddress, shopkeeperAddress, additionalData = {}) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  
  return this.create({
    pickupId: pickupId.toString(),
    deliveryAgentAddress: deliveryAgentAddress.toLowerCase(),
    shopkeeperAddress: shopkeeperAddress.toLowerCase(),
    otpCode,
    deliveryLocation: additionalData.deliveryLocation || null,
    rationAmount: additionalData.rationAmount || null,
    category: additionalData.category || null
  });
};

// Static method to verify OTP
OTPSchema.statics.verifyOTP = async function(pickupId, shopkeeperAddress, otpCode) {
  const otpDoc = await this.findOne({
    pickupId: pickupId.toString(),
    shopkeeperAddress: shopkeeperAddress.toLowerCase(),
    otpCode: otpCode,
    isUsed: false
  });

  if (!otpDoc) {
    return {
      success: false,
      message: 'Invalid OTP or OTP has expired',
      error: 'OTP_INVALID_OR_EXPIRED'
    };
  }

  // Check if OTP is expired (just in case TTL hasn't kicked in yet)
  const now = new Date();
  const otpAge = (now - otpDoc.generatedAt) / 1000; // age in seconds
  
  if (otpAge > 300) { // 5 minutes
    return {
      success: false,
      message: 'OTP has expired',
      error: 'OTP_EXPIRED'
    };
  }

  // Mark OTP as used
  otpDoc.isUsed = true;
  otpDoc.usedAt = now;
  await otpDoc.save();

  return {
    success: true,
    message: 'OTP verified successfully',
    otpDoc: {
      pickupId: otpDoc.pickupId,
      deliveryAgentAddress: otpDoc.deliveryAgentAddress,
      shopkeeperAddress: otpDoc.shopkeeperAddress,
      generatedAt: otpDoc.generatedAt,
      usedAt: otpDoc.usedAt,
      deliveryLocation: otpDoc.deliveryLocation,
      rationAmount: otpDoc.rationAmount,
      category: otpDoc.category
    }
  };
};

// Static method to get OTP details (for debugging/admin)
OTPSchema.statics.getOTPDetails = async function(pickupId, userAddress) {
  return await this.findOne({
    pickupId: pickupId.toString(),
    $or: [
      { deliveryAgentAddress: userAddress.toLowerCase() },
      { shopkeeperAddress: userAddress.toLowerCase() }
    ]
  }).select('-otpCode'); // Don't return the actual OTP code
};

// Clean expired OTPs manually (backup to TTL)
OTPSchema.statics.cleanExpiredOTPs = async function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return await this.deleteMany({
    generatedAt: { $lt: fiveMinutesAgo }
  });
};

const OTP = mongoose.models.OTP || mongoose.model('OTP', OTPSchema);

export default OTP;