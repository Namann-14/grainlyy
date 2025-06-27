import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Fix the import path to point to the client/abis folder
import RegistrationFaucetABI from '../../../../../abis/RegistrationFaucet.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export async function POST(request) {
  try {
    const { aadhaar, name, mobile, category, shopkeeperAddress } = await request.json();
    
    // Validate inputs
    if (!aadhaar || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required consumer data' },
        { status: 400 }
      );
    }
    
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Contract address not configured in environment variables' },
        { status: 500 }
      );
    }
    
    console.log('API using contract address:', CONTRACT_ADDRESS);
    
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Initialize admin wallet
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, RegistrationFaucetABI, wallet);
    
    // Convert Aadhaar to BigInt for blockchain
    const aadhaarBN = BigInt(aadhaar);
    
    console.log('Registering consumer on blockchain:', {
      aadhaar: aadhaarBN.toString(),
      name,
      mobile: mobile || "",
      category,
      shopkeeperAddress: shopkeeperAddress || "0x0000000000000000000000000000000000000000"
    });
    
    // Register consumer on blockchain
    const tx = await contract.registerConsumer(
      aadhaarBN,
      name,
      mobile || "", // Use empty string if mobile is null/undefined
      category,
      shopkeeperAddress || "0x0000000000000000000000000000000000000000"
    );
    
    console.log('Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    const explorerUrl = `${process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL || "https://mumbai.polygonscan.com/tx/"}${tx.hash}`;
    
    return NextResponse.json({ 
      success: true, 
      txHash: tx.hash,
      explorerUrl
    });
  } catch (error) {
    console.error('Consumer registration failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}