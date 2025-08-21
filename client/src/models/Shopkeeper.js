// import mongoose, { Schema } from "mongoose";

// const ShopkeeperSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   address: {
//     type: String,
//     required: true,
//     trim: true,
//   },
// }, {
//   timestamps: true,
// });

// // Add indexes for better query performance
// ShopkeeperSchema.index({ name: 1 });
// ShopkeeperSchema.index({ name: 'text', address: 'text' }); // Text search

// // Static method to find by name
// ShopkeeperSchema.statics.findByName = function(name) {
//   return this.find({ name: new RegExp(name, 'i') });
// };

// const Shopkeeper = mongoose.models.Shopkeeper || 
//   mongoose.model("Shopkeeper", ShopkeeperSchema);

// export default Shopkeeper;


import mongoose from "mongoose";

const ShopkeeperSchema = new mongoose.Schema({
  shopkeeperAddress: { type: String, required: true },
  name: { type: String, default: "Unknown" },
  area: { type: String, default: "Unknown" },
  mobile: { type: String, default: "Not provided" },
  registrationTime: { type: Number },
  totalConsumersAssigned: { type: Number, default: 0 },
  totalTokensIssued: { type: Number, default: 0 },
  totalDeliveries: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  dataSource: { type: String, default: "database" },
});

// Prevent model overwrite issue in Next.js hot reload
export default mongoose.models.Shopkeeper ||
  mongoose.model("Shopkeeper", ShopkeeperSchema);
