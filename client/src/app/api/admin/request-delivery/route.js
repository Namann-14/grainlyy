import { NextResponse } from "next/server";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// RPC URLs
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
           item.name.toLowerCase().includes('agent'))
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

// Get contract instance with admin wallet
async function getAdminContract() {
  try {
    if (!ADMIN_PRIVATE_KEY) {
      throw new Error("Admin private key not configured");
    }
    
    const provider = getWorkingProvider();
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const abi = getMergedABI();
    
    if (!abi || abi.length === 0) {
      throw new Error("No ABI functions available");
    }
    
    return new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  } catch (error) {
    console.error('Error creating admin contract instance:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { consumerAddress, tokenAmount, shopkeeperAddress } = body;

    if (!consumerAddress || !shopkeeperAddress) {
      return NextResponse.json(
        { success: false, error: 'Consumer address and shopkeeper address are required' },
        { status: 400 }
      );
    }

    console.log(`🚚 Requesting delivery agent for consumer: ${consumerAddress}`);
    console.log(`🏪 From shopkeeper: ${shopkeeperAddress}`);

    const contract = await getAdminContract();
    
    // Try different function names for requesting delivery
    const possibleFunctionNames = [
      'requestDeliveryAgent',
      'requestDelivery',
      'assignDeliveryRequest',
      'createDeliveryRequest'
    ];
    
    let txHash = null;
    let usedFunction = null;
    
    for (const functionName of possibleFunctionNames) {
      try {
        console.log(`🧪 Trying function: ${functionName}`);
        
        let tx;
        if (functionName === 'requestDeliveryAgent') {
          // Most likely function signature
          tx = await contract[functionName](consumerAddress, shopkeeperAddress);
        } else if (functionName === 'requestDelivery') {
          tx = await contract[functionName](consumerAddress, shopkeeperAddress, tokenAmount || 1);
        } else if (functionName === 'assignDeliveryRequest') {
          tx = await contract[functionName](consumerAddress, shopkeeperAddress);
        } else if (functionName === 'createDeliveryRequest') {
          tx = await contract[functionName](consumerAddress, shopkeeperAddress);
        }
        
        console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
        const receipt = await tx.wait();
        
        txHash = tx.hash;
        usedFunction = functionName;
        console.log(`✅ Delivery request successful using ${functionName}`);
        break;
        
      } catch (error) {
        console.log(`❌ Function ${functionName} failed:`, error.message);
        continue;
      }
    }
    
    if (!usedFunction) {
      // Fallback: Try to find any delivery-related function
      const abi = getMergedABI();
      const deliveryFunctions = abi.filter(item => 
        item.type === 'function' && 
        item.name && 
        (item.name.toLowerCase().includes('delivery') || 
         item.name.toLowerCase().includes('agent') ||
         item.name.toLowerCase().includes('request'))
      );
      
      throw new Error(`No working delivery request function found. Available delivery functions: ${deliveryFunctions.map(f => f.name).join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery agent requested successfully',
      transactionHash: txHash,
      usedFunction: usedFunction,
      consumerAddress: consumerAddress,
      shopkeeperAddress: shopkeeperAddress
    });

  } catch (error) {
    console.error('❌ Error requesting delivery agent:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to request delivery agent: ' + error.message
      },
      { status: 500 }
    );
  }
}
