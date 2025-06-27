import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Fix the import path to point to the client/abis folder
import DashboardFaucetABI from '../../../../../abis/DashboardFaucet.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function GET() {
  try {
    // Try to get categories from the blockchain using the DashboardFaucet contract
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, DashboardFaucetABI, provider);
    
    // Call the getCategoryWiseStats function to get all categories
    const [categories, counts, amounts] = await contract.getCategoryWiseStats();
    
    return NextResponse.json({ 
      success: true, 
      categories: categories,
      counts: counts.map(c => Number(c)),
      amounts: amounts.map(a => Number(a))
    });
  } catch (error) {
    console.error('Error fetching valid categories:', error);
    // Fallback to default categories if blockchain call fails
    return NextResponse.json({ 
      success: false, 
      categories: ['AAY', 'BPL', 'APL', 'PHH'],
      error: error.message 
    });
  }
}