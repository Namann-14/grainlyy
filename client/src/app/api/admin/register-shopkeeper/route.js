import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function POST(request) {
  try {
    const { shopkeeperAddress, name, area } = await request.json();

    // Validate required fields
    if (!shopkeeperAddress || !name || !area) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: shopkeeperAddress, name, area' },
        { status: 400 }
      );
    }

    // Validate shopkeeper address format
    if (!ethers.isAddress(shopkeeperAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shopkeeper address format' },
        { status: 400 }
      );
    }

    console.log('🏪 Registering shopkeeper on blockchain:', {
      shopkeeperAddress,
      name,
      area
    });

    // Check environment variables
    if (!RPC_URL || !ADMIN_PRIVATE_KEY || !CONTRACT_ADDRESS) {
      console.error('Missing environment variables:', {
        RPC_URL: !!RPC_URL,
        ADMIN_PRIVATE_KEY: !!ADMIN_PRIVATE_KEY,
        CONTRACT_ADDRESS: !!CONTRACT_ADDRESS
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error - missing environment variables' },
        { status: 500 }
      );
    }

    // Initialize blockchain connection
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DiamondMergedABI, wallet);

    console.log('🔗 Blockchain connection established');
    console.log('📝 Calling registerShopkeeper function...');

    // Register shopkeeper on blockchain
    const tx = await contract.registerShopkeeper(
      shopkeeperAddress,
      name,
      area
    );

    console.log('⏳ Transaction submitted:', tx.hash);
    console.log('⏳ Waiting for transaction confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    // Generate PolygonScan URL
    const polygonScanUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;

    return NextResponse.json({
      success: true,
      message: 'Shopkeeper registered successfully',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      polygonScanUrl,
      shopkeeper: {
        address: shopkeeperAddress,
        name,
        area
      }
    });

  } catch (error) {
    console.error('❌ Shopkeeper registration failed:', error);
    
    // Handle specific blockchain errors
    if (error.code === 'CALL_EXCEPTION') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Smart contract call failed - shopkeeper may already be registered or invalid parameters',
          details: error.reason || error.message
        },
        { status: 400 }
      );
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient funds for gas fees',
          details: 'Admin wallet needs more MATIC for transaction fees'
        },
        { status: 400 }
      );
    }

    if (error.code === 'NETWORK_ERROR') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network connection failed',
          details: 'Unable to connect to Polygon network'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register shopkeeper: ' + error.message,
        details: error.code || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
