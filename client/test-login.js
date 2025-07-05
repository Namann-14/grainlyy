const fetch = require('node-fetch');

async function testLoginEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  // Test wallet addresses
  const testWallets = [
    '0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa', // Admin address
    '0x1234567890123456789012345678901234567890', // Random test address
    '0x9876543210987654321098765432109876543210'  // Another test address
  ];
  
  console.log('🧪 Testing Login Endpoints\n');
  
  for (const wallet of testWallets) {
    console.log(`\n🔍 Testing wallet: ${wallet}`);
    
    // Test Shopkeeper Login
    try {
      console.log('  📦 Testing shopkeeper login...');
      const shopkeeperResponse = await fetch(`${baseUrl}/api/shopkeeper-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet })
      });
      
      const shopkeeperData = await shopkeeperResponse.json();
      console.log('  📦 Shopkeeper result:', shopkeeperData.success ? 'SUCCESS' : 'NOT FOUND');
      if (shopkeeperData.success) {
        console.log('      Name:', shopkeeperData.shopkeeper.name);
        console.log('      Source:', shopkeeperData.shopkeeper.source);
      }
    } catch (error) {
      console.log('  📦 Shopkeeper error:', error.message);
    }
    
    // Test Delivery Login
    try {
      console.log('  🚚 Testing delivery login...');
      const deliveryResponse = await fetch(`${baseUrl}/api/delivery-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet })
      });
      
      const deliveryData = await deliveryResponse.json();
      console.log('  🚚 Delivery result:', deliveryData.success ? 'SUCCESS' : 'NOT FOUND');
      if (deliveryData.success) {
        console.log('      Name:', deliveryData.deliveryPartner.name);
        console.log('      Source:', deliveryData.deliveryPartner.source);
      }
    } catch (error) {
      console.log('  🚚 Delivery error:', error.message);
    }
  }
  
  console.log('\n🎉 Login endpoint testing complete!');
}

// Run the test
testLoginEndpoints().catch(console.error);
