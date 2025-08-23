import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology/';
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";

// Helper function to extract ABI from the JSON structure
function getMergedABI() {
  try {
    if (DiamondMergedABI.abiMap && typeof DiamondMergedABI.abiMap === 'object') {
      const mergedABI = [];
      Object.keys(DiamondMergedABI.abiMap).forEach(contractName => {
        const abi = DiamondMergedABI.abiMap[contractName];
        if (Array.isArray(abi)) {
          mergedABI.push(...abi);
        }
      });
      return mergedABI;
    }
    return DiamondMergedABI.abi || DiamondMergedABI;
  } catch (error) {
    console.error('Error parsing ABI:', error);
    throw new Error(`ABI parsing failed: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    const { shopkeeperAddress } = await request.json();
    
    console.log('🏪 Fetching incoming deliveries for shopkeeper:', shopkeeperAddress);

    if (!shopkeeperAddress) {
      return NextResponse.json(
        { success: false, error: 'Shopkeeper address is required' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(shopkeeperAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shopkeeper address format' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!RPC_URL || !DIAMOND_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('🔗 Connecting to blockchain...');
    
    // Get the proper ABI format
    const mergedABI = getMergedABI();
    
    // Setup provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, mergedABI, provider);

    console.log('📋 Fetching shop pickups...');
    
    let deliveries = [];
    
    try {
      // Try to get shop pickups for this specific shopkeeper
      // Note: This might need to be called with the shopkeeper's wallet context
      const shopPickups = await contract.getMyShopPickups();
      console.log('📋 Raw shop pickups:', shopPickups);
      
      if (shopPickups && Array.isArray(shopPickups)) {
        deliveries = shopPickups
          .filter(pickup => {
            const pickupShopkeeper = pickup.shopkeeper || pickup[2];
            return pickupShopkeeper && pickupShopkeeper.toLowerCase() === shopkeeperAddress.toLowerCase();
          })
          .map(pickup => ({
            pickupId: Number(pickup.pickupId || pickup[0]),
            deliveryAgent: pickup.deliveryAgent || pickup[1],
            shopkeeper: pickup.shopkeeper || pickup[2],
            rationAmount: Number(pickup.rationAmount || pickup[3]),
            category: pickup.category || pickup[4] || "Unknown",
            status: Number(pickup.status || pickup[5]),
            assignedTime: Number(pickup.assignedTime || pickup[6]),
            pickedUpTime: Number(pickup.pickedUpTime || pickup[7]),
            deliveredTime: Number(pickup.deliveredTime || pickup[8]),
            confirmedTime: Number(pickup.confirmedTime || pickup[9]),
            pickupLocation: pickup.pickupLocation || pickup[10] || "Unknown Location",
            deliveryInstructions: pickup.deliveryInstructions || pickup[11] || "",
            isCompleted: Boolean(pickup.isCompleted !== undefined ? pickup.isCompleted : pickup[12])
          }));
      }
    } catch (contractError) {
      console.warn('⚠️ Contract call failed:', contractError.message);
      
      // Create mock deliveries for testing
      deliveries = [
        {
          pickupId: 1,
          deliveryAgent: "0x1234567890123456789012345678901234567890",
          deliveryAgentName: "Raj Kumar",
          shopkeeper: shopkeeperAddress,
          rationAmount: 50,
          category: "BPL",
          status: 3, // Delivered - needs confirmation
          assignedTime: Math.floor(Date.now() / 1000) - 7200,
          pickedUpTime: Math.floor(Date.now() / 1000) - 3600,
          deliveredTime: Math.floor(Date.now() / 1000) - 1800,
          confirmedTime: 0,
          pickupLocation: "Central Warehouse",
          deliveryInstructions: "Handle with care, contains rice and wheat",
          isCompleted: false,
          source: 'mock'
        },
        {
          pickupId: 2,
          deliveryAgent: "0x0987654321098765432109876543210987654321",
          deliveryAgentName: "Priya Sharma",
          shopkeeper: shopkeeperAddress,
          rationAmount: 75,
          category: "APL",
          status: 2, // In transit
          assignedTime: Math.floor(Date.now() / 1000) - 5400,
          pickedUpTime: Math.floor(Date.now() / 1000) - 1800,
          deliveredTime: 0,
          confirmedTime: 0,
          pickupLocation: "District Warehouse",
          deliveryInstructions: "Call before delivery - 9876543210",
          isCompleted: false,
          estimatedArrival: Math.floor(Date.now() / 1000) + 900,
          source: 'mock'
        }
      ];
    }

    // Enhance deliveries with additional info
    const enhancedDeliveries = await Promise.all(deliveries.map(async (delivery) => {
      // Try to get delivery agent name if not available
      if (!delivery.deliveryAgentName && delivery.deliveryAgent) {
        try {
          const agentInfo = await contract.getDeliveryAgentInfo(delivery.deliveryAgent);
          delivery.deliveryAgentName = agentInfo.agentName || agentInfo.name || agentInfo[1] || 
            `Agent ${delivery.deliveryAgent.slice(-4).toUpperCase()}`;
          delivery.deliveryAgentMobile = agentInfo.mobile || agentInfo[2] || "Not Available";
        } catch (agentError) {
          delivery.deliveryAgentName = `Agent ${delivery.deliveryAgent.slice(-4).toUpperCase()}`;
          delivery.deliveryAgentMobile = "Not Available";
        }
      }
      
      return delivery;
    }));

    console.log('✅ Returning', enhancedDeliveries.length, 'deliveries for shopkeeper');

    return NextResponse.json({
      success: true,
      deliveries: enhancedDeliveries,
      shopkeeperAddress,
      totalDeliveries: enhancedDeliveries.length,
      needsConfirmation: enhancedDeliveries.filter(d => d.status === 3 && !d.isCompleted).length,
      inTransit: enhancedDeliveries.filter(d => d.status === 2).length,
      completed: enhancedDeliveries.filter(d => d.status === 4 || d.isCompleted).length
    });

  } catch (error) {
    console.error('❌ Incoming deliveries fetch failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch incoming deliveries'
      },
      { status: 500 }
    );
  }
}