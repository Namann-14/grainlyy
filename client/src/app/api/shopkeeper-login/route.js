import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { ethers } from "ethers";

// Smart contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ABI = require("../../../../abis/DiamondMergedABI.json");

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    console.log("🔍 Shopkeeper login API called with wallet:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // First, check blockchain for registered shopkeeper
    try {
      console.log("🔗 Checking blockchain for shopkeeper...");
      const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      const shopkeeperInfo = await contract.getShopkeeperInfo(walletAddress);
      
      // Check if shopkeeper exists (non-zero address means registered)
      if (shopkeeperInfo.shopkeeperAddress !== ethers.ZeroAddress) {
        console.log("✅ Shopkeeper found on blockchain");
        return NextResponse.json({
          success: true,
          shopkeeper: {
            id: walletAddress,
            name: shopkeeperInfo.name,
            walletAddress: shopkeeperInfo.shopkeeperAddress,
            shopName: shopkeeperInfo.area, // Using area as shop name
            area: shopkeeperInfo.area,
            totalConsumers: shopkeeperInfo.totalConsumersAssigned.toString(),
            totalDeliveries: shopkeeperInfo.totalDeliveries.toString(),
            source: "blockchain"
          }
        });
      }
    } catch (blockchainError) {
      console.log("⚠️ Blockchain check failed, falling back to database:", blockchainError.message);
    }

    // Fallback to database check
    const db = await connectDB();
    
    const shopkeeper = await db.collection("shopkeepers").findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: "approved"
    });

    console.log("🔍 Shopkeeper found in database:", shopkeeper ? "Yes" : "No");

    if (shopkeeper) {
      return NextResponse.json({
        success: true,
        shopkeeper: {
          id: shopkeeper._id,
          name: shopkeeper.name,
          walletAddress: shopkeeper.walletAddress,
          shopName: shopkeeper.shopName,
          source: "database"
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        shopkeeper: null
      });
    }
  } catch (error) {
    console.error("Shopkeeper login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
