const { ethers } = require('ethers');

async function checkContractState() {
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const contractAddress = "0xD21958aa2130C1E8cFA88dd82b352DCa068B3059";
  
  // Use only functions we know exist
  const abi = [
    "function getConsumerByAadhaar(uint256 aadhaar) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive))"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    console.log('📋 Checking consumer state...');
    
    // Check consumer details
    const aadhaar = 123456780012;
    const consumer = await contract.getConsumerByAadhaar(aadhaar);
    console.log('\n📊 Consumer details:');
    console.log('Aadhaar:', Number(consumer.aadhaar));
    console.log('Name:', consumer.name);
    console.log('Mobile:', consumer.mobile);
    console.log('Category:', consumer.category);
    console.log('Registration Time:', Number(consumer.registrationTime));
    console.log('Assigned Shopkeeper:', consumer.assignedShopkeeper);
    console.log('Total Tokens Received:', Number(consumer.totalTokensReceived));
    console.log('Total Tokens Claimed:', Number(consumer.totalTokensClaimed));
    console.log('Last Token Issued Time:', Number(consumer.lastTokenIssuedTime));
    console.log('Is Active:', consumer.isActive);
    
    // Check if consumer already has tokens for current month
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = currentTimestamp - (30 * 24 * 60 * 60);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    console.log('\n⏰ Time analysis:');
    console.log('Current timestamp:', currentTimestamp);
    console.log('Current month:', currentMonth);
    console.log('Current year:', currentYear);
    console.log('30 days ago:', thirtyDaysAgo);
    console.log('Last token issued:', Number(consumer.lastTokenIssuedTime));
    console.log('Has recent token:', Number(consumer.lastTokenIssuedTime) > thirtyDaysAgo);
    
    // Available tokens
    const availableTokens = Number(consumer.totalTokensReceived) - Number(consumer.totalTokensClaimed);
    console.log('\n💰 Token status:');
    console.log('Available tokens:', availableTokens);
    console.log('Total received:', Number(consumer.totalTokensReceived));
    console.log('Total claimed:', Number(consumer.totalTokensClaimed));
    
    console.log('\n🔍 Issues that might prevent token generation:');
    if (!consumer.isActive) {
      console.log('❌ Consumer is INACTIVE');
    }
    if (Number(consumer.lastTokenIssuedTime) > thirtyDaysAgo) {
      console.log('❌ Consumer already has a token issued in the last 30 days');
    }
    if (consumer.assignedShopkeeper === "0x0000000000000000000000000000000000000000") {
      console.log('❌ Consumer has no assigned shopkeeper');
    }
    
    if (consumer.isActive && Number(consumer.lastTokenIssuedTime) <= thirtyDaysAgo && consumer.assignedShopkeeper !== "0x0000000000000000000000000000000000000000") {
      console.log('✅ Consumer should be eligible for token generation');
    }
    
  } catch (error) {
    console.error('Error checking contract state:', error);
  }
}

checkContractState();
