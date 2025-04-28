import mongoose from "mongoose";
const { Schema } = mongoose;

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const deliveryRiderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    profileImage: {
      type: String,
    },
    currentLocation: {
      type: pointSchema,
      index: "2dsphere",  // Keep this index definition
    },
    status: {
      type: String,
      enum: ["available", "busy", "offline", "suspended"],
      default: "offline",
    },
    currentDelivery: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
    },
  },
  {
    timestamps: true,
  }
);

// Remove this line to avoid duplicate index:
// deliveryRiderSchema.index({ currentLocation: "2dsphere" });

const DeliveryRider = mongoose.model("DeliveryRider", deliveryRiderSchema);

export default DeliveryRider;