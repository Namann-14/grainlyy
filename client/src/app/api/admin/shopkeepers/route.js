import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function GET() {
  try {
    console.log('🔗 Fetching shopkeepers from blockchain...');
    
    if (!RPC_URL || !DIAMOND_ADDRESS) {
      throw new Error('Missing environment variables: RPC_URL or DIAMOND_ADDRESS');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, DiamondMergedABI, provider);

    console.log('📋 Calling getAllShopkeepers...');
    
    // Get all shopkeeper addresses using getAllShopkeepers
    const shopkeeperAddresses = await contract.getAllShopkeepers();
    console.log('📋 Found shopkeeper addresses:', shopkeeperAddresses);

    if (!shopkeeperAddresses || shopkeeperAddresses.length === 0) {
      console.log('⚠️ No shopkeepers found on blockchain');
      return NextResponse.json({
        success: true,
        shopkeepers: [],
        totalCount: 0,
        message: 'No shopkeepers registered on blockchain yet'
      });
    }

    // Get detailed info for each shopkeeper
    const shopkeepers = await Promise.all(
      shopkeeperAddresses.map(async (address) => {
        try {
          console.log(`📋 Fetching info for shopkeeper: ${address}`);
          const info = await contract.getShopkeeperInfo(address);
          
          // Handle both array and object return formats
          let shopkeeperObj;
          if (Array.isArray(info)) {
            // Tuple/array format: [address, name, area, registrationTime, totalConsumersAssigned, totalTokensIssued, totalDeliveries, isActive]
            shopkeeperObj = {
              address: info[0] || address,
              name: info[1] || 'Unnamed Shopkeeper',
              area: info[2] || 'Unknown Area',
              registrationTime: Number(info[3] || 0),
              totalConsumersAssigned: Number(info[4] || 0),
              totalTokensIssued: Number(info[5] || 0),
              totalDeliveries: Number(info[6] || 0),
              isActive: Boolean(info[7])
            };
          } else {
            // Object format
            shopkeeperObj = {
              address: info.shopkeeperAddress || address,
              name: info.name || 'Unnamed Shopkeeper',
              area: info.area || 'Unknown Area',
              registrationTime: Number(info.registrationTime || 0),
              totalConsumersAssigned: Number(info.totalConsumersAssigned || 0),
              totalTokensIssued: Number(info.totalTokensIssued || 0),
              totalDeliveries: Number(info.totalDeliveries || 0),
              isActive: Boolean(info.isActive)
            };
          }

          console.log(`✅ Shopkeeper info for ${address}:`, shopkeeperObj);
          return shopkeeperObj;
        } catch (error) {
          console.error(`❌ Failed to get info for shopkeeper ${address}:`, error);
          // Return minimal info if detailed fetch fails
          return {
            address: address,
            name: 'Failed to load',
            area: 'Failed to load',
            registrationTime: 0,
            totalConsumersAssigned: 0,
            totalTokensIssued: 0,
            totalDeliveries: 0,
            isActive: false,
            error: error.message
          };
        }
      })
    );

    // Filter out invalid or inactive shopkeepers
    const validShopkeepers = shopkeepers.filter(
      s => s.address && 
           s.address !== '0x0000000000000000000000000000000000000000' && 
           s.isActive && 
           !s.error
    );

    console.log(`✅ Successfully fetched ${validShopkeepers.length} valid shopkeepers`);

    return NextResponse.json({
      success: true,
      shopkeepers: validShopkeepers,
      totalCount: validShopkeepers.length,
      allAddresses: shopkeeperAddresses
    });

  } catch (error) {
    console.error('❌ Error fetching shopkeepers:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      shopkeepers: [],
      totalCount: 0
    });
  }
}