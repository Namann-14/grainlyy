import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

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
    const { deliveryAgent, shopkeeper, rationAmount, category, pickupLocation, deliveryInstructions } = await request.json();
    
    console.log('🚚 Assigning pickup:', { deliveryAgent, shopkeeper, rationAmount, category, pickupLocation });

    // Validate inputs
    if (!deliveryAgent || !shopkeeper || !rationAmount || !category || !pickupLocation) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    if (!ethers.isAddress(deliveryAgent) || !ethers.isAddress(shopkeeper)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!RPC_URL || !DIAMOND_ADDRESS || !ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error - missing environment variables' },
        { status: 500 }
      );
    }

    console.log('🔗 Connecting to blockchain...');
    
    // Get the proper ABI format
    const mergedABI = getMergedABI();
    
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, mergedABI, wallet);

    console.log('📝 Calling assignRationPickup function...');
    
    // Assign pickup on blockchain
    const tx = await contract.assignRationPickup(
      deliveryAgent,
      shopkeeper,
      ethers.parseUnits(rationAmount.toString(), 0), // Convert to uint256
      category,
      pickupLocation,
      deliveryInstructions || ""
    );
    
    console.log('⏳ Transaction sent, waiting for confirmation...');
    console.log('📋 Transaction hash:', tx.hash);
    
    const receipt = await tx.wait(1);
    console.log('✅ Pickup assignment confirmed!');
    console.log('⛽ Gas used:', receipt.gasUsed.toString());

    // Extract pickup ID from events
    let pickupId = null;
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const iface = new ethers.Interface(mergedABI);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'RationPickupAssigned') {
              pickupId = parsed.args.pickupId.toString();
              break;
            }
          } catch (parseError) {
            // Continue to next log
          }
        }
      } catch (eventError) {
        console.warn('Could not parse events:', eventError);
      }
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      pickupId: pickupId,
      message: `Pickup assigned successfully to ${deliveryAgent}`,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      assignment: {
        deliveryAgent,
        shopkeeper,
        rationAmount,
        category,
        pickupLocation,
        deliveryInstructions
      }
    });

  } catch (error) {
    console.error('❌ Pickup assignment failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      if (error.message.includes('execution reverted')) {
        errorMessage = 'Transaction reverted - ' + (error.reason || 'check contract conditions');
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error - please try again';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: {
          code: error.code,
          reason: error.reason,
          action: error.action
        }
      },
      { status: 500 }
    );
  }
}