const { ethers } = require('ethers');
const ABI = require('./abis/DiamondMergedABI.json');
require('dotenv').config({ path: '.env.local' });

async function addMissingFunctions() {
  try {
    console.log('🔧 Adding missing functions to Diamond contract...');
    
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK';
    
    // Known facet addresses from deployment (Amoy testnet)
    const REGISTRATION_FACET = '0xA90992835119E1035598694da4083Ff45D12Ca07';
    const DASHBOARD_FACET = '0x6bC49f60FDA6C4d6832A95747a83A5c601f37353';
    
    if (!CONTRACT_ADDRESS || !ADMIN_PRIVATE_KEY) {
      throw new Error('Missing CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY in environment');
    }
    
    console.log('📍 Contract Address:', CONTRACT_ADDRESS);
    console.log('📍 Registration Facet:', REGISTRATION_FACET);
    console.log('📍 Amoy RPC URL:', RPC_URL);
    console.log('📍 Network: Polygon Amoy Testnet');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    
    // Create interface to get function selectors
    const iface = new ethers.Interface(ABI);
    
    // Get the function selectors we need to add
    const getShopkeeperInfoSelector = iface.getFunction('getShopkeeperInfo').selector;
    const getDeliveryAgentInfoSelector = iface.getFunction('getDeliveryAgentInfo').selector;
    
    console.log('🎯 Function selectors to add:');
    console.log('  getShopkeeperInfo:', getShopkeeperInfoSelector);
    console.log('  getDeliveryAgentInfo:', getDeliveryAgentInfoSelector);
    
    // Test if functions are already working
    console.log('🧪 Testing current function availability...');
    
    let needsShopkeeper = false;
    let needsDelivery = false;
    
    try {
      await contract.getShopkeeperInfo('0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa');
      console.log('✅ getShopkeeperInfo already working');
    } catch (error) {
      if (error.code === 'BAD_DATA' && error.value === '0x') {
        console.log('❌ getShopkeeperInfo needs to be added');
        needsShopkeeper = true;
      } else {
        console.log('✅ getShopkeeperInfo working (different error):', error.message.substring(0, 50));
      }
    }
    
    try {
      await contract.getDeliveryAgentInfo('0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa');
      console.log('✅ getDeliveryAgentInfo already working');
    } catch (error) {
      if (error.code === 'BAD_DATA' && error.value === '0x') {
        console.log('❌ getDeliveryAgentInfo needs to be added');
        needsDelivery = true;
      } else {
        console.log('✅ getDeliveryAgentInfo working (different error):', error.message.substring(0, 50));
      }
    }
    
    if (!needsShopkeeper && !needsDelivery) {
      console.log('🎉 Both functions are already working!');
      return;
    }
    
    // Prepare diamond cut data
    const functionsToAdd = [];
    if (needsShopkeeper) functionsToAdd.push(getShopkeeperInfoSelector);
    if (needsDelivery) functionsToAdd.push(getDeliveryAgentInfoSelector);
    
    console.log('💎 Preparing diamond cut...');
    console.log('📝 Functions to add:', functionsToAdd);
    console.log('🏭 Using Registration Facet address:', REGISTRATION_FACET);
    
    const diamondCutData = [{
      facetAddress: REGISTRATION_FACET,
      action: 0, // Add = 0, Replace = 1, Remove = 2
      functionSelectors: functionsToAdd
    }];
    
    // Perform the diamond cut
    console.log('⛏️ Executing diamond cut...');
    const tx = await contract.diamondCut(diamondCutData, ethers.ZeroAddress, '0x');
    console.log('📤 Transaction hash:', tx.hash);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Diamond cut successful!');
    console.log('📊 Gas used:', receipt.gasUsed.toString());
    console.log('🔗 Amoy Explorer: https://amoy.polygonscan.com/tx/' + tx.hash);
    
    // Wait a moment for the blockchain to update
    console.log('⏳ Waiting 3 seconds for blockchain state to update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the functions are now available
    console.log('🧪 Testing functions after diamond cut...');
    
    if (needsShopkeeper) {
      try {
        const testShopkeeper = await contract.getShopkeeperInfo('0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa');
        console.log('✅ getShopkeeperInfo now working!');
        console.log('   Sample response:', {
          address: testShopkeeper.shopkeeperAddress,
          name: testShopkeeper.name || 'No name',
          area: testShopkeeper.area || 'No area'
        });
      } catch (error) {
        console.log('❌ getShopkeeperInfo still not working:', error.message.substring(0, 100));
      }
    }
    
    if (needsDelivery) {
      try {
        const testDelivery = await contract.getDeliveryAgentInfo('0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa');
        console.log('✅ getDeliveryAgentInfo now working!');
        console.log('   Sample response:', {
          address: testDelivery.agentAddress,
          name: testDelivery.name || 'No name',
          mobile: testDelivery.mobile || 'No mobile',
          isActive: testDelivery.isActive
        });
      } catch (error) {
        console.log('❌ getDeliveryAgentInfo still not working:', error.message.substring(0, 100));
      }
    }
    
    console.log('🎉 Diamond cut process completed!');
    console.log('💡 You can now test the login endpoints again');
    
  } catch (error) {
    console.error('❌ Error adding functions to Diamond:', error);
    
    if (error.code === 'CALL_EXCEPTION') {
      console.log('� This might be a permission issue or the facet might not contain these functions');
      console.log('💡 Make sure you are using the admin wallet and the correct facet address');
    }
  }
}

addMissingFunctions();
