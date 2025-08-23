import mongoose from "mongoose";

const DeliveryRiderSchema = new mongoose.Schema({
  agentAddress: { type: String, required: true, unique: true },
  name: { type: String, default: "Unknown Rider" },
  mobile: { type: String, default: "Not provided" },
  assignedAgent: { type: String, default: "0x0000000000000000000000000000000000000000" },
  totalDeliveries: { type: Number, default: 0 },
  registrationTime: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  isActive: { type: Boolean, default: true },
  dataSource: { type: String, default: "database" },
  txHash: { type: String },
}, { timestamps: true });

export default mongoose.models.DeliveryRider ||
  mongoose.model("DeliveryRider", DeliveryRiderSchema);
