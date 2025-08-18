import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";

// Backend wallet configuration
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// RPC URLs for fallback
const RPC_URLS = [
  'https://rpc-amoy.polygon.technology/',
  'https://polygon-amoy-bor-rpc.publicnode.com'
];

// Get working provider
function getWorkingProvider() {
  for (const rpcUrl of RPC_URLS) {
    try {
      return new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.warn(`Provider ${rpcUrl} failed:`, error);
    }
  }
  throw new Error('All RPC providers failed');
}

// Merge ABIs from DiamondMergedABI with deduplication
function getMergedABI() {
  try {
    const mergedABI = [];
    const functionSignatures = new Set();
    
    if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
      console.log("📄 Available contracts:", Object.keys(DiamondMergedABI.contracts));
      
      Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
        const contractData = DiamondMergedABI.contracts[contractName];
        if (contractData.abi && Array.isArray(contractData.abi)) {
          console.log(`📄 Processing ${contractName} with ${contractData.abi.length} functions`);
          
          contractData.abi.forEach(item => {
            // Skip constructors
            if (item.type === 'constructor') {
              return;
            }
            
            // Create unique signature
            let signature = '';
            if (item.type === 'function') {
              signature = `${item.name}(${(item.inputs || []).map(input => input.type).join(',')})`;
            } else if (item.type === 'event') {
              signature = `event_${item.name}(${(item.inputs || []).map(input => input.type).join(',')})`;
            } else {
              signature = `${item.type}_${JSON.stringify(item)}`;
            }
            
            if (!functionSignatures.has(signature)) {
              functionSignatures.add(signature);
              mergedABI.push(item);
            }
          });
        }
      });
      
      if (mergedABI.length > 0) {
        console.log(`📄 Total unique ABI functions: ${mergedABI.length}`);
        
        // Log delivery-related functions
        const deliveryFunctions = mergedABI.filter(item => 
          item.type === 'function' && 
          item.name && 
          (item.name.toLowerCase().includes('delivery') || 
           item.name.toLowerCase().includes('agent') ||
           item.name.toLowerCase().includes('register'))
        );
        console.log("🚚 Delivery-related functions found:", deliveryFunctions.map(f => f.name));
        
        return mergedABI;
      }
    }
    
    throw new Error("Could not find valid ABI structure");
  } catch (error) {
    console.error('Error loading merged ABI:', error);
    return [];
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { action, adminNote = '', adminId, name, phone, walletAddress, shopkeeperAddress } = body;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the signup request
    const signupRequest = await DeliverySignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (signupRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    let txHash = null;

    // Handle blockchain operations for approval
    if (action === 'approve') {
      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address is required for approval' },
          { status: 400 }
        );
      }

      try {
        // Initialize backend wallet
        if (!ADMIN_PRIVATE_KEY || !DIAMOND_PROXY_ADDRESS) {
          throw new Error('Backend wallet configuration missing in environment variables');
        }

        const provider = getWorkingProvider();
        const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
        const abi = getMergedABI();
        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, abi, wallet);

        console.log('🚀 Starting blockchain registration for delivery agent:', {
          walletAddress,
          name: name || signupRequest.name,
          phone: phone || signupRequest.phone
        });

        // Register delivery agent on blockchain using the correct function
        console.log('📝 Registering delivery agent using registerDeliveryAgent...');
        
        const registerTx = await contract.registerDeliveryAgent(
          walletAddress,                    // agent address
          name || signupRequest.name,       // name string
          phone || signupRequest.phone      // mobile string
        );

        console.log('⏳ Waiting for registration transaction confirmation:', registerTx.hash);
        const registerReceipt = await registerTx.wait();
        console.log('✅ Registration transaction confirmed:', registerReceipt.transactionHash);
        
        txHash = registerTx.hash;

        // Optional: Assign to shopkeeper if provided
        if (shopkeeperAddress) {
          try {
            console.log('🔗 Assigning delivery agent to shopkeeper...');
            const assignTx = await contract.assignDeliveryAgentToShopkeeper(
              walletAddress,
              shopkeeperAddress
            );
            
            console.log('⏳ Waiting for assignment transaction confirmation:', assignTx.hash);
            await assignTx.wait();
            console.log('✅ Assignment transaction confirmed');
          } catch (assignError) {
            console.warn('⚠️ Assignment failed but registration succeeded:', assignError.message);
            // Continue with success since registration worked
          }
        }

      } catch (blockchainError) {
        console.error('❌ Blockchain registration failed:', blockchainError);
        return NextResponse.json(
          { 
            error: `Blockchain registration failed: ${blockchainError.message}`,
            details: blockchainError.message
          },
          { status: 500 }
        );
      }
    }

    // Update database status
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminNote,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    if (txHash) {
      updateData.blockchainTxHash = txHash;
    }

    const updatedRequest = await DeliverySignupRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    console.log(`✅ Delivery signup request ${action}ed successfully`);

    return NextResponse.json({
      success: true,
      message: `Request ${action}ed successfully`,
      request: updatedRequest,
      txHash: txHash
    });

  } catch (error) {
    console.error(`Error ${action}ing delivery signup request:`, error);
    return NextResponse.json(
      { 
        error: `Failed to ${action} request: ${error.message}`,
        details: error.message
      },
      { status: 500 }
    );
  }
}
