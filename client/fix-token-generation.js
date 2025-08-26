// FIXED TOKEN GENERATION FUNCTIONS
// Replace the existing functions with these corrected versions

// 1. First, fix the DCVToken minter setup (ALREADY DONE)
async function handleSetDCVMinter() {
  try {
    console.log('Setting Diamond contract as DCVToken minter...');

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    
    const DCVTokenABI = require('../../../../abis/DCVToken.json');
    const dcvTokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS || "0xC336869ac6f9D51888ab27615a086524C281D3Aa",
      DCVTokenABI,
      wallet
    );

    // Set the Diamond contract address as the minter (not admin wallet)
    const diamondContractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    
    console.log(`Setting minter to Diamond contract: ${diamondContractAddress}`);

    const tx = await dcvTokenContract.setMinter(diamondContractAddress);

    console.log(`📤 Set minter transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`✅ Minter set successfully`);
      
      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
        message: `DCVToken minter set to Diamond contract successfully`
      });
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Set DCVToken minter error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to set DCVToken minter: ${error.message}`
    }, { status: 500 });
  }
}

// 2. Fixed individual token generation
async function handleGenerateTokenForConsumer(body) {
  try {
    const { aadhaar } = body;
    console.log(`🎯 Generating token for consumer: ${aadhaar}`);

    // Use Diamond contract for token generation (proper way)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    
    const DiamondMergedABI = require('../../../../abis/DiamondMergedABI.json');
    const diamondContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DiamondMergedABI,
      wallet
    );

    console.log(`Calling generateTokenForConsumer with aadhaar: ${aadhaar}`);

    // Generate token using Diamond contract
    const tx = await diamondContract.generateTokenForConsumer(aadhaar);

    console.log(`📤 Token generation transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`✅ Token generated successfully for consumer ${aadhaar}`);
      
      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
        message: `Token generated successfully for consumer ${aadhaar}`
      });
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Generate token error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate token: ${error.message}`
    }, { status: 500 });
  }
}

// 3. Fixed monthly token generation
async function handleGenerateMonthlyTokens() {
  try {
    console.log('🎯 Starting monthly token generation for all consumers...');

    // Get all consumers first
    const allConsumers = await getAllConsumers();
    if (!allConsumers || allConsumers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No consumers found to generate tokens for'
      }, { status: 400 });
    }

    console.log(`🎯 Generating monthly tokens for ${allConsumers.length} consumers`);

    // Use Diamond contract for token generation (proper way)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    
    const DiamondMergedABI = require('../../../../abis/DiamondMergedABI.json');
    const diamondContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DiamondMergedABI,
      wallet
    );

    console.log('✅ Diamond contract initialized for monthly token generation');

    // Generate tokens for each consumer using Diamond contract
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allConsumers.length; i++) {
      const consumer = allConsumers[i];
      try {
        const aadhaar = BigInt(consumer.aadhaar || consumer[0]);

        console.log(`📦 Processing consumer ${i + 1}/${allConsumers.length}: ${aadhaar}`);

        // Generate token using Diamond contract
        const tx = await diamondContract.generateTokenForConsumer(aadhaar);

        console.log(`📤 Token generation transaction sent for ${aadhaar}: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          successCount++;
          console.log(`✅ Token generated successfully for consumer ${aadhaar}`);
        } else {
          errorCount++;
          console.log(`❌ Token generation failed for consumer ${aadhaar}`);
        }

        // Add small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ Error generating token for consumer ${consumer.aadhaar}:`, error.message);
      }
    }

    const summary = `Monthly token generation completed: ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped`;
    console.log(summary);

    return NextResponse.json({
      success: true,
      txHash: successCount > 0 ? 'batch_operation' : 'no_transactions',
      polygonScanUrl: `https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`,
      message: summary,
      details: {
        totalConsumers: allConsumers.length,
        successful: successCount,
        failed: errorCount,
        skipped: skippedCount
      }
    });

  } catch (error) {
    console.error('Monthly token generation error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate monthly tokens: ${error.message}`
    }, { status: 500 });
  }
}