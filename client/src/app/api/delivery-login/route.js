import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DeliverySignupRequest from "@/models/DeliverySignupRequest";
import { ethers } from "ethers";

// Smart contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ABI = require("../../../../abis/DiamondMergedABI.json");

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    console.log("🔍 Delivery login API called with wallet:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // First, check blockchain for registered delivery agent
    try {
      console.log("🔗 Checking blockchain for delivery agent...");
      const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      const deliveryAgentInfo = await contract.getDeliveryAgentInfo(walletAddress);
      
      // Check if agent exists and is active
      if (deliveryAgentInfo.agentAddress !== ethers.ZeroAddress && deliveryAgentInfo.isActive) {
        console.log("✅ Active delivery agent found on blockchain");
        return NextResponse.json({
          success: true,
          deliveryPartner: {
            id: walletAddress,
            name: deliveryAgentInfo.name,
            walletAddress: deliveryAgentInfo.agentAddress,
            phoneNumber: deliveryAgentInfo.mobile,
            vehicleType: "N/A", // Not stored on blockchain
            source: "blockchain"
          }
        });
      }
    } catch (blockchainError) {
      console.log("⚠️ Blockchain check failed, falling back to database:", blockchainError.message);
    }

    // Fallback to database check
    await connectDB();

    const deliveryPartner = await DeliverySignupRequest.findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: "approved"
    });

    console.log("🔍 Delivery partner found in database:", deliveryPartner ? "Yes" : "No");

    if (deliveryPartner) {
      return NextResponse.json({
        success: true,
        deliveryPartner: {
          id: deliveryPartner._id,
          name: deliveryPartner.name,
          walletAddress: deliveryPartner.walletAddress,
          phoneNumber: deliveryPartner.phoneNumber,
          vehicleType: deliveryPartner.vehicleType,
          blockchainTxHash: deliveryPartner.blockchainTxHash,
          source: "database"
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        deliveryPartner: null
      });
    }

  } catch (error) {
    console.error("Delivery login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
