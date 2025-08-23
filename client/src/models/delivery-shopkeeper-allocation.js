import mongoose, { Schema } from "mongoose";

const DeliveryShopkeeperAllocationSchema = new mongoose.Schema({
  shopkeeper: {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    }
  },
  deliveryRider: {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    }
  },
  allocationDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
}, {
  timestamps: true, // adds createdAt and updatedAt automatically
});

// Add indexes for better query performance
DeliveryShopkeeperAllocationSchema.index({ 'shopkeeper.address': 1 });
DeliveryShopkeeperAllocationSchema.index({ 'deliveryRider.address': 1 });
DeliveryShopkeeperAllocationSchema.index({ status: 1 });
DeliveryShopkeeperAllocationSchema.index({ allocationDate: 1 });

// Virtual field to check if allocation is currently active
DeliveryShopkeeperAllocationSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Static method to find allocations by shopkeeper address
DeliveryShopkeeperAllocationSchema.statics.findByShopkeeper = function(shopkeeperAddress) {
  return this.find({ 'shopkeeper.address': shopkeeperAddress });
};

// Static method to find allocations by delivery rider address
DeliveryShopkeeperAllocationSchema.statics.findByDeliveryRider = function(riderAddress) {
  return this.find({ 'deliveryRider.address': riderAddress });
};

// Instance method to deactivate allocation
DeliveryShopkeeperAllocationSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

// Instance method to activate allocation
DeliveryShopkeeperAllocationSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

const DeliveryShopkeeperAllocation = mongoose.models.DeliveryShopkeeperAllocation || 
  mongoose.model("DeliveryShopkeeperAllocation", DeliveryShopkeeperAllocationSchema);

export default DeliveryShopkeeperAllocation;
