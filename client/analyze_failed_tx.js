const { ethers } = require('ethers');

async function analyzeFailedTransaction() {
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  
  // The failed transaction hash from our test
  const txHash = "0x47c35d6076f6abf099fa6cc484fb9af8b9c2e433e6ff8791913a3c53990d241a";
  
  try {
    console.log('🔍 Analyzing failed transaction...');
    console.log('TX Hash:', txHash);
    
    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    console.log('\n📋 Transaction Details:');
    console.log('From:', tx.from);
    console.log('To:', tx.to);
    console.log('Value:', ethers.formatEther(tx.value), 'MATIC');
    console.log('Gas Limit:', tx.gasLimit.toString());
    console.log('Gas Price:', ethers.formatUnits(tx.gasPrice, 'gwei'), 'gwei');
    console.log('Data:', tx.data);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log('\n📋 Transaction Receipt:');
    console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Block Number:', receipt.blockNumber);
    
    // Decode the transaction data to see what function was called
    const functionSelector = tx.data.slice(0, 10);
    console.log('\n🔍 Function Analysis:');
    console.log('Function Selector:', functionSelector);
    
    // Try to decode the data assuming it's generateTokenForConsumer(uint256)
    try {
      const abi = ["function generateTokenForConsumer(uint256 aadhaar)"];
      const iface = new ethers.Interface(abi);
      const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
      console.log('Decoded Function:', decoded.name);
      console.log('Arguments:', decoded.args);
    } catch (e) {
      console.log('Could not decode function call');
    }
    
    // Check if there are any logs/events (even though it failed)
    console.log('\n📋 Transaction Logs:');
    console.log('Number of logs:', receipt.logs.length);
    receipt.logs.forEach((log, index) => {
      console.log(`Log ${index}:`, {
        address: log.address,
        topics: log.topics,
        data: log.data
      });
    });
    
  } catch (error) {
    console.error('Error analyzing transaction:', error);
  }
}

analyzeFailedTransaction();
