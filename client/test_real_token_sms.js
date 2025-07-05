const { ethers } = require('ethers');
const twilio = require('twilio');

// Initialize Twilio (using environment variables)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testRealTokenSMS() {
  try {
    const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const contractAddress = "0xD21958aa2130C1E8cFA88dd82b352DCa068B3059";
    
    const abi = [
      "function getUnclaimedTokensByAadhaar(uint256 aadhaar) view returns (uint256[])",
      "function getConsumerByAadhaar(uint256 aadhaar) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive))",
      "function getShopkeeperInfo(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))"
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    const aadhaar = 123456780012;
    console.log('🔍 Getting consumer and token information...');
    
    // Get consumer details
    const consumer = await contract.getConsumerByAadhaar(aadhaar);
    console.log('👤 Consumer:', consumer.name, '|', consumer.category);
    
    // Get real token ID
    const unclaimedTokens = await contract.getUnclaimedTokensByAadhaar(aadhaar);
    const realTokenId = unclaimedTokens.length > 0 ? Number(unclaimedTokens[unclaimedTokens.length - 1]) : 'T-' + aadhaar.toString().slice(-4);
    console.log('🎫 Real Token ID:', realTokenId);
    
    // Get shopkeeper details
    const shopkeeper = await contract.getShopkeeperInfo(consumer.assignedShopkeeper);
    console.log('🏪 Shopkeeper:', shopkeeper.name, 'at', shopkeeper.area);
    
    // Create the real SMS message
    const message = `🍚 GRAINLY: ${consumer.name}, your ${consumer.category} ration token #${realTokenId} is ready! Collect 5kg from ${shopkeeper.name}, ${shopkeeper.area}. Valid till month end.`;
    
    console.log('\n📱 Real SMS message:');
    console.log(message);
    console.log(`📏 Length: ${message.length} characters`);
    
    // Send the SMS with real token ID
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      console.log('\n📤 Sending SMS with real token ID...');
      
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+918284941698' // Consumer's mobile number
      });
      
      console.log('✅ SMS sent successfully!');
      console.log('📋 Message SID:', result.sid);
      console.log('🎯 Token ID sent:', realTokenId);
      
    } else {
      console.log('⚠️ Twilio not configured, SMS not sent');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealTokenSMS();
