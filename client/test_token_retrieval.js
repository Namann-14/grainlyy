const { ethers } = require('ethers');

async function testTokenRetrieval() {
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const contractAddress = "0xD21958aa2130C1E8cFA88dd82b352DCa068B3059";
  
  const abi = [
    "function getUnclaimedTokensByAadhaar(uint256 aadhaar) view returns (uint256[])",
    "function getConsumerByAadhaar(uint256 aadhaar) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive))"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    const aadhaar = 123456780012;
    console.log('🔍 Getting token information for Aadhaar:', aadhaar);
    
    // Get consumer details
    const consumer = await contract.getConsumerByAadhaar(aadhaar);
    console.log('👤 Consumer:', consumer.name);
    console.log('📊 Total tokens received:', Number(consumer.totalTokensReceived));
    console.log('📊 Total tokens claimed:', Number(consumer.totalTokensClaimed));
    console.log('📊 Available tokens:', Number(consumer.totalTokensReceived) - Number(consumer.totalTokensClaimed));
    
    // Get unclaimed token IDs
    try {
      const unclaimedTokens = await contract.getUnclaimedTokensByAadhaar(aadhaar);
      console.log('\n🎫 Unclaimed token IDs:');
      if (unclaimedTokens && unclaimedTokens.length > 0) {
        unclaimedTokens.forEach((tokenId, index) => {
          console.log(`  ${index + 1}. Token ID: ${Number(tokenId)}`);
        });
        
        const latestTokenId = Number(unclaimedTokens[unclaimedTokens.length - 1]);
        console.log(`\n✅ Latest token ID for SMS: ${latestTokenId}`);
        
        // Test SMS message generation
        const testMessage = `🍚 GRAINLY: ${consumer.name}, your ${consumer.category} ration token #${latestTokenId} is ready! Collect 5kg from your assigned shop. Valid till month end.`;
        console.log('\n📱 Test SMS message:');
        console.log(testMessage);
        console.log(`📏 Message length: ${testMessage.length} characters`);
        
      } else {
        console.log('  No unclaimed tokens found');
        
        // Fallback token ID generation
        const fallbackTokenId = `T-${aadhaar.toString().slice(-4)}`;
        console.log(`\n⚠️ Using fallback token ID: ${fallbackTokenId}`);
      }
    } catch (tokenError) {
      console.error('❌ Error getting unclaimed tokens:', tokenError.message);
      const fallbackTokenId = `T-${aadhaar.toString().slice(-4)}`;
      console.log(`⚠️ Using fallback token ID: ${fallbackTokenId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTokenRetrieval();
