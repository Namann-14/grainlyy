import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

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
    const { walletAddress } = await request.json();
    
    console.log('🚚 Fetching delivery agent info for:', walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
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

    console.log('📋 Calling getDeliveryAgentDashboard...');
    
    try {
      // Get delivery agent info from blockchain
      const agentData = await contract.getDeliveryAgentDashboard(walletAddress);
      console.log('📋 Raw agent data from blockchain:', agentData);
      
      // Parse the response (handle both array and object formats)
      const agentInfo = {
        agentAddress: agentData.agentAddress || agentData[0] || walletAddress,
        name: agentData.agentName || agentData.name || agentData[1] || `Agent ${walletAddress.slice(-4).toUpperCase()}`,
        mobile: agentData.mobile || agentData[2] || "Not Set",
        registrationTime: Number(agentData.registrationTime || agentData[3]) || 0,
        assignedShopkeeper: agentData.assignedShopkeeper || agentData[4] || ethers.ZeroAddress,
        totalDeliveries: Number(agentData.totalDeliveries || agentData[5]) || 0,
        isActive: Boolean(agentData.isActive !== undefined ? agentData.isActive : (agentData[6] !== undefined ? agentData[6] : true))
      };

      console.log('✅ Parsed agent info:', agentInfo);

      return NextResponse.json({
        success: true,
        agent: agentInfo,
        source: 'blockchain'
      });

    } catch (blockchainError) {
      console.warn('⚠️ Blockchain call failed:', blockchainError.message);
      
      // If blockchain fails, try to get info from database or return basic info
      const fallbackInfo = {
        agentAddress: walletAddress,
        name: `Agent ${walletAddress.slice(-4).toUpperCase()}`,
        mobile: "Not Set",
        registrationTime: Math.floor(Date.now() / 1000),
        assignedShopkeeper: ethers.ZeroAddress,
        totalDeliveries: 0,
        totalPickupsAssigned: 0,
        isActive: true
      };

      console.log('📝 Using fallback agent info:', fallbackInfo);

      return NextResponse.json({
        success: true,
        agent: fallbackInfo,
        source: 'fallback',
        warning: 'Could not fetch from blockchain, using fallback data'
      });
    }

  } catch (error) {
    console.error('❌ Delivery agent info fetch failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch delivery agent info'
      },
      { status: 500 }
    );
  }
}