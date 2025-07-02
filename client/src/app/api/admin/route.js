import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Token Operations ABI - Simplified without events
const TOKEN_OPS_ABI = [
  "function generateTokenForConsumer(uint256 aadhaar) external",
  "function generateTokensForCategory(string category) external", 
  "function generateMonthlyTokensForAll() external"
];

// Dashboard ABI
const DASHBOARD_ABI = [
  "function getConsumersPaginated(uint256 offset, uint256 limit) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[] consumerList, uint256 total)",
  "function getConsumersByCategory(string category) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function searchConsumersByName(string nameQuery) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function getConsumerByAadhaar(uint256 aadhaar) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive))",
  "function getShopkeeperInfo(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))",
  "function getUnclaimedTokensByAadhaar(uint256 aadhaar) view returns (uint256[])",
  "function getAdminDashboard() view returns (tuple(uint256 totalConsumers, uint256 totalShopkeepers, uint256 totalDeliveryAgents, uint256 totalTokensIssued, uint256 totalTokensClaimed, uint256 totalTokensExpired, uint256 pendingTokens, uint256 currentMonth, uint256 currentYear, uint256 lastUpdateTime))",
  "function getRecentActivityLogs(uint256 limit) view returns (tuple(uint256 timestamp, address actor, string action, uint256 aadhaar, uint256 tokenId, string details)[])",
  "function getSystemHealthReport() view returns (uint256 totalRegisteredConsumers, uint256 activeConsumers, uint256 inactiveConsumers, uint256 consumersWithCurrentMonthToken, uint256 consumersWithoutCurrentMonthToken, uint256 totalShopkeepers, uint256 totalDeliveryAgents, uint256 systemEfficiencyScore)",
  "function getAreaWiseStats() view returns (string[] areas, uint256[] shopkeeperCounts, uint256[] consumerCounts, uint256[] activeConsumers)",
  "function getCategoryWiseStats() view returns (string[] categories, uint256[] consumerCounts, uint256[] rationAmounts)",
  "function getConsumersNeedingEmergencyHelp() view returns (uint256[])",
  "function getShopkeepers() view returns (tuple(address shopkeeperAddress, string name, string area, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, uint256 registrationTime, bool isActive)[])",
  "function getDeliveryAgents() view returns (tuple(address agentAddress, string name, string mobile, address assignedShopkeeper, uint256 totalDeliveries, uint256 registrationTime, bool isActive)[])"
];

// Use public RPC
const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");

// Initialize contracts
let adminWallet, dashboardContract, tokenOpsContract;

try {
  adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY || "cc7a9fa8676452af481a0fd486b9e2f500143bc63893171770f4d76e7ead33ec", 
    provider
  );

  const CONTRACT_ADDRESS = "0x3Dc96d060b9F1C5Ca408B68e3C1071078451bE67";
  
  dashboardContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    DASHBOARD_ABI,
    provider
  );

  tokenOpsContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    TOKEN_OPS_ABI,
    adminWallet
  );

  console.log('Blockchain components initialized successfully');
  console.log('Admin wallet address:', adminWallet.address);
  console.log('Contract address:', CONTRACT_ADDRESS);
  
} catch (error) {
  console.error('Failed to initialize blockchain components:', error);
}

// SMS Helper Functions
async function sendSMSNotification(phoneNumber, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio not configured - SMS notification skipped');
      return { success: false, error: 'Twilio not configured' };
    }

    // Check message length for trial account (limit is usually 160 characters)
    if (message.length > 160) {
      console.warn(`⚠️ Message too long (${message.length} chars), truncating...`);
      message = message.substring(0, 157) + '...';
    }

    // Format phone number - ensure it has country code
    let formattedNumber = phoneNumber.toString().replace(/\D/g, ''); // Remove non-digits
    if (formattedNumber.length === 10) {
      formattedNumber = '+91' + formattedNumber; // Add India country code
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+91' + formattedNumber;
    }

    console.log(`📱 Attempting to send SMS to: ${formattedNumber}`);
    console.log(`📝 Message length: ${message.length} characters`);
    console.log(`📄 Message: ${message}`);

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log('✅ SMS sent successfully:', result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Handle specific Twilio errors
    if (error.code === 30044) {
      console.error('🚫 Message too long for trial account');
      return { 
        success: false, 
        error: 'Message too long for trial account. Please upgrade Twilio or use shorter messages.',
        errorCode: error.code
      };
    }
    
    return { success: false, error: error.message, errorCode: error.code };
  }
}

async function getConsumerDetails(aadhaar) {
  try {
    const consumer = await dashboardContract.getConsumerByAadhaar(aadhaar);
    return {
      aadhaar: Number(consumer.aadhaar),
      name: consumer.name,
      mobile: consumer.mobile,
      category: consumer.category,
      assignedShopkeeper: consumer.assignedShopkeeper
    };
  } catch (error) {
    console.error('Error fetching consumer details:', error);
    return null;
  }
}

async function getShopkeeperDetails(shopkeeperAddress) {
  try {
    const shopkeeper = await dashboardContract.getShopkeeperInfo(shopkeeperAddress);
    return {
      name: shopkeeper.name,
      area: shopkeeper.area,
      address: shopkeeper.shopkeeperAddress
    };
  } catch (error) {
    console.error('Error fetching shopkeeper details:', error);
    return { name: 'Assigned Shop', area: 'Your Area', address: shopkeeperAddress };
  }
}

function createSMSMessage(consumerName, tokenId, shopkeeperName, shopkeeperArea, category, rationAmount = 5) {
  // Short message under 160 characters for trial account
  return `🍚 GRAINLY: ${consumerName}, your ${category} ration token #${tokenId} is ready! Collect ${rationAmount}kg from ${shopkeeperName}. Valid till month end.`;
}

// Alternative even shorter message if needed
function createShortSMSMessage(consumerName, tokenId, category) {
  return `GRAINLY: ${consumerName}, token #${tokenId} ready. Collect your ${category} ration now!`;
}

// Updated sendSMSToConsumer function with shorter message
async function sendSMSToConsumer(consumer) {
  try {
    // Get shopkeeper details
    const shopkeeper = await getShopkeeperDetails(consumer.assignedShopkeeper);

    // Generate a mock token ID based on current time
    const tokenId = Date.now().toString().slice(-6); // Last 6 digits of timestamp

    // Create SHORT SMS message for trial account
    const message = createSMSMessage(
      consumer.name,
      tokenId,
      shopkeeper.name,
      shopkeeper.area,
      consumer.category,
      5 // Default ration amount
    );

    // If still too long, use even shorter version
    let finalMessage = message;
    if (message.length > 160) {
      finalMessage = createShortSMSMessage(consumer.name, tokenId, consumer.category);
    }

    // Send SMS
    const result = await sendSMSNotification(consumer.mobile, finalMessage);
    
    if (result.success) {
      console.log(`✅ SMS sent to ${consumer.name} (${consumer.mobile})`);
    } else {
      console.error(`❌ SMS failed for ${consumer.name}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending SMS to consumer:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to format consumer data for SMS
function formatConsumerBasic(consumer) {
  return {
    aadhaar: Number(consumer.aadhaar),
    name: consumer.name,
    mobile: consumer.mobile,
    category: consumer.category,
    assignedShopkeeper: consumer.assignedShopkeeper
  };
}

// MISSING FUNCTION - Simplified SMS notification without event dependency
async function sendSMSNotifications(operationType, category = null, aadhaarList = null) {
  try {
    console.log(`📱 Starting SMS notifications for ${operationType}...`);
    
    let consumersToNotify = [];
    
    if (operationType === 'individual' && aadhaarList && aadhaarList.length > 0) {
      // Individual consumer(s)
      for (const aadhaar of aadhaarList) {
        try {
          const consumer = await getConsumerDetails(aadhaar);
          if (consumer) {
            consumersToNotify.push(consumer);
          }
        } catch (error) {
          console.error(`Failed to get consumer ${aadhaar}:`, error);
        }
      }
    } else if (operationType === 'category' && category) {
      // Category-based
      try {
        const consumers = await dashboardContract.getConsumersByCategory(category);
        consumersToNotify = consumers.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get category consumers:', error);
      }
    } else if (operationType === 'monthly') {
      // All consumers
      try {
        const result = await dashboardContract.getConsumersPaginated(0, 1000); // Get up to 1000
        consumersToNotify = result.consumerList.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get all consumers:', error);
      }
    }

    console.log(`Found ${consumersToNotify.length} consumers to notify`);

    let smsCount = 0;
    for (const consumer of consumersToNotify) {
      try {
        await sendSMSToConsumer(consumer);
        smsCount++;
        console.log(`SMS ${smsCount}/${consumersToNotify.length} sent to ${consumer.name}`);
        
        // Rate limiting - 2 seconds between SMS to avoid Twilio limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send SMS to ${consumer.name}:`, error);
      }
    }

    console.log(`📱 SMS notifications completed: ${smsCount}/${consumersToNotify.length} sent`);
    return { success: true, smsSent: smsCount, totalConsumers: consumersToNotify.length };
    
  } catch (error) {
    console.error('SMS notification process failed:', error);
    return { success: false, error: error.message };
  }
}

// GET request handler
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case 'dashboard':
        return await handleDashboard();
      case 'consumers':
        return await handleConsumers(searchParams);
      case 'shopkeepers':
        return await handleShopkeepers();
      case 'delivery-agents':
        return await handleDeliveryAgents();
      case 'area-stats':
        return await handleAreaStats();
      case 'category-stats':
        return await handleCategoryStats();
      case 'emergency-cases':
        return await handleEmergencyCases();
      case 'system-health-report':
        return await handleSystemHealth();
      case 'recent-activity':
        return await handleRecentActivity(searchParams);
      default:
        return NextResponse.json({ success: false, error: 'Invalid endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process request'
    }, { status: 500 });
  }
}

// POST request handler with simplified SMS integration
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    let body = {};
    try {
      const text = await request.text();
      if (text && text.trim() !== '') {
        body = JSON.parse(text);
      }
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    console.log('POST endpoint:', endpoint);
    console.log('Request body:', body);

    switch (endpoint) {
      case 'generate-monthly-tokens':
        return await handleGenerateMonthlyTokens();
      case 'generate-token-consumer':
      case 'generate-individual-token':
        return await handleGenerateTokenForConsumer(body);
      case 'generate-category-tokens':
        return await handleGenerateTokensForCategory(body);
      case 'generate-bpl-tokens':
        return await handleGenerateTokensForCategory({ category: 'BPL' });
      case 'generate-apl-tokens':
        return await handleGenerateTokensForCategory({ category: 'APL' });
      case 'test-sms':
        return await handleTestSMS();
      default:
        return NextResponse.json({ 
          success: false, 
          error: `Invalid endpoint: ${endpoint}` 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API POST Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process request'
    }, { status: 500 });
  }
}

// Generate monthly tokens for all consumers with SMS
async function handleGenerateMonthlyTokens() {
  try {
    if (!tokenOpsContract) {
      throw new Error('Token operations contract not initialized');
    }

    console.log('🚀 Generating monthly tokens for all consumers...');
    
    const tx = await tokenOpsContract.generateMonthlyTokensForAll({
      gasLimit: 2000000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    // Wait for transaction confirmation before sending SMS
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      // Send SMS notifications in background
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('monthly');
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000); // Wait 2 seconds before starting SMS
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Monthly token generation completed successfully. SMS notifications are being sent to all consumers.'
    });
  } catch (error) {
    console.error('Generate monthly tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate monthly tokens: ${error.message}`
    }, { status: 500 });
  }
}

// Generate token for specific consumer with SMS
async function handleGenerateTokenForConsumer(body) {
  try {
    if (!tokenOpsContract) {
      throw new Error('Token operations contract not initialized');
    }

    const { aadhaar } = body;
    
    if (!aadhaar) {
      throw new Error('Aadhaar number is required');
    }

    console.log(`🚀 Generating token for consumer: ${aadhaar}`);
    
    const tx = await tokenOpsContract.generateTokenForConsumer(aadhaar, {
      gasLimit: 500000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    // Wait for transaction confirmation before sending SMS
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      // Send SMS notification in background
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('individual', null, [aadhaar]);
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000); // Wait 2 seconds before starting SMS
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Token generation completed for Aadhaar ${aadhaar}. SMS notification is being sent to the consumer.`
    });
  } catch (error) {
    console.error('Generate token for consumer error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate token: ${error.message}`
    }, { status: 500 });
  }
}

// Generate tokens for category with SMS
async function handleGenerateTokensForCategory(body) {
  try {
    if (!tokenOpsContract) {
      throw new Error('Token operations contract not initialized');
    }

    const { category } = body;
    
    if (!category) {
      throw new Error('Category is required');
    }

    console.log(`🚀 Generating tokens for category: ${category}`);
    
    const tx = await tokenOpsContract.generateTokensForCategory(category, {
      gasLimit: 1500000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    // Wait for transaction confirmation before sending SMS
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      // Send SMS notifications in background
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('category', category);
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000); // Wait 2 seconds before starting SMS
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Token generation completed for category ${category}. SMS notifications are being sent to all ${category} consumers.`
    });
  } catch (error) {
    console.error('Generate tokens for category error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate tokens for category: ${error.message}`
    }, { status: 500 });
  }
}

// Test SMS handler
async function handleTestSMS() {
  try {
    const testMessage = `GRAINLY TEST: SMS working! Time: ${new Date().getHours()}:${new Date().getMinutes()}`;
    
    console.log('🧪 Testing short SMS...');
    console.log(`📝 Test message length: ${testMessage.length} characters`);
    
    const result = await sendSMSNotification('8284941698', testMessage);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully!' : 'Test SMS failed',
      details: result,
      instructions: result.success 
        ? 'Check your phone for the test message' 
        : 'Check Twilio Console for error details'
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Dashboard data with fallback
async function handleDashboard() {
  try {
    console.log('Fetching dashboard data...');
    
    if (!dashboardContract) {
      throw new Error('Dashboard contract not initialized');
    }

    const dashboardData = await dashboardContract.getAdminDashboard();
    
    return NextResponse.json({
      success: true,
      data: {
        totalConsumers: Number(dashboardData.totalConsumers),
        totalShopkeepers: Number(dashboardData.totalShopkeepers),
        totalDeliveryAgents: Number(dashboardData.totalDeliveryAgents),
        totalTokensIssued: Number(dashboardData.totalTokensIssued),
        totalTokensClaimed: Number(dashboardData.totalTokensClaimed),
        totalTokensExpired: Number(dashboardData.totalTokensExpired),
        pendingTokens: Number(dashboardData.pendingTokens),
        currentMonth: Number(dashboardData.currentMonth),
        currentYear: Number(dashboardData.currentYear),
        lastUpdateTime: Number(dashboardData.lastUpdateTime)
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    
    return NextResponse.json({
      success: true,
      data: {
        totalConsumers: 0,
        totalShopkeepers: 0,
        totalDeliveryAgents: 0,
        totalTokensIssued: 0,
        totalTokensClaimed: 0,
        totalTokensExpired: 0,
        pendingTokens: 0,
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        lastUpdateTime: Math.floor(Date.now() / 1000)
      },
      warning: 'Using fallback data - blockchain connection unavailable'
    });
  }
}

// Consumers data with fallback
async function handleConsumers(searchParams) {
  try {
    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '50';
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let consumers;
    
    if (search) {
      consumers = await dashboardContract.searchConsumersByName(search);
      return NextResponse.json({
        success: true,
        data: consumers.map(formatConsumer),
        total: consumers.length
      });
    } else if (category && category !== 'all') {
      consumers = await dashboardContract.getConsumersByCategory(category);
      return NextResponse.json({
        success: true,
        data: consumers.map(formatConsumer),
        total: consumers.length
      });
    } else {
      const result = await dashboardContract.getConsumersPaginated(offset, limit);
      return NextResponse.json({
        success: true,
        data: result.consumerList.map(formatConsumer),
        total: Number(result.total),
        pagination: {
          offset: Number(offset),
          limit: Number(limit),
          totalPages: Math.ceil(Number(result.total) / Number(limit))
        }
      });
    }
  } catch (error) {
    console.error('Consumers fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
      warning: 'No consumer data available - blockchain connection issue'
    });
  }
}

// Shopkeepers data with fallback
async function handleShopkeepers() {
  try {
    const shopkeepers = await dashboardContract.getShopkeepers();
    
    return NextResponse.json({
      success: true,
      data: shopkeepers.map(shopkeeper => ({
        shopkeeperAddress: shopkeeper.shopkeeperAddress,
        name: shopkeeper.name,
        area: shopkeeper.area,
        totalConsumersAssigned: Number(shopkeeper.totalConsumersAssigned),
        totalTokensIssued: Number(shopkeeper.totalTokensIssued),
        totalDeliveries: Number(shopkeeper.totalDeliveries),
        registrationTime: Number(shopkeeper.registrationTime),
        isActive: shopkeeper.isActive
      }))
    });
  } catch (error) {
    console.error('Shopkeepers fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No shopkeeper data available - blockchain connection issue'
    });
  }
}

// Delivery agents data with fallback
async function handleDeliveryAgents() {
  try {
    const agents = await dashboardContract.getDeliveryAgents();
    
    return NextResponse.json({
      success: true,
      data: agents.map(agent => ({
        agentAddress: agent.agentAddress,
        name: agent.name,
        mobile: agent.mobile,
        assignedShopkeeper: agent.assignedShopkeeper,
        totalDeliveries: Number(agent.totalDeliveries),
        registrationTime: Number(agent.registrationTime),
        isActive: agent.isActive
      }))
    });
  } catch (error) {
    console.error('Delivery agents fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No delivery agent data available - blockchain connection issue'
    });
  }
}

// Area-wise statistics with fallback
async function handleAreaStats() {
  try {
    const areaStats = await dashboardContract.getAreaWiseStats();
    
    const areas = areaStats.areas;
    const shopkeepers = areaStats.shopkeeperCounts;
    const consumers = areaStats.consumerCounts;
    const activeConsumers = areaStats.activeConsumers;

    const formattedStats = areas.map((area, index) => ({
      area,
      shopkeepers: Number(shopkeepers[index]),
      consumers: Number(consumers[index]),
      activeConsumers: Number(activeConsumers[index])
    }));

    return NextResponse.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Area stats fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No area statistics available - blockchain connection issue'
    });
  }
}

// Category-wise statistics with fallback
async function handleCategoryStats() {
  try {
    const categoryStats = await dashboardContract.getCategoryWiseStats();
    
    const categories = categoryStats.categories;
    const consumers = categoryStats.consumerCounts;
    const rationAmounts = categoryStats.rationAmounts;

    const formattedStats = categories.map((category, index) => ({
      category,
      consumers: Number(consumers[index]),
      rationAmounts: Number(rationAmounts[index])
    }));

    return NextResponse.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Category stats fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No category statistics available - blockchain connection issue'
    });
  }
}

// Emergency cases with fallback
async function handleEmergencyCases() {
  try {
    const emergencyAadhaars = await dashboardContract.getConsumersNeedingEmergencyHelp();
    
    const emergencyConsumers = [];
    
    for (const aadhaar of emergencyAadhaars) {
      try {
        const consumer = await dashboardContract.getConsumerByAadhaar(aadhaar);
        emergencyConsumers.push(formatConsumer(consumer));
      } catch (error) {
        console.error(`Failed to fetch consumer ${aadhaar}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: emergencyConsumers
    });
  } catch (error) {
    console.error('Emergency cases fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No emergency cases data available - blockchain connection issue'
    });
  }
}

// System health report with fallback
async function handleSystemHealth() {
  try {
    const healthData = await dashboardContract.getSystemHealthReport();
    
    return NextResponse.json({
      success: true,
      data: {
        totalRegisteredConsumers: Number(healthData.totalRegisteredConsumers),
        activeConsumers: Number(healthData.activeConsumers),
        inactiveConsumers: Number(healthData.inactiveConsumers),
        consumersWithCurrentMonthToken: Number(healthData.consumersWithCurrentMonthToken),
        consumersWithoutCurrentMonthToken: Number(healthData.consumersWithoutCurrentMonthToken),
        totalShopkeepers: Number(healthData.totalShopkeepers),
        totalDeliveryAgents: Number(healthData.totalDeliveryAgents),
        systemEfficiencyScore: Number(healthData.systemEfficiencyScore)
      }
    });
  } catch (error) {
    console.error('System health fetch error:', error);
    return NextResponse.json({
      success: true,
      data: {
        totalRegisteredConsumers: 0,
        activeConsumers: 0,
        inactiveConsumers: 0,
        consumersWithCurrentMonthToken: 0,
        consumersWithoutCurrentMonthToken: 0,
        totalShopkeepers: 0,
        totalDeliveryAgents: 0,
        systemEfficiencyScore: 0
      },
      warning: 'Using fallback health data - blockchain connection issue'
    });
  }
}

// Recent activity with fallback
async function handleRecentActivity(searchParams) {
  try {
    const limit = searchParams.get('limit') || '10';
    const activity = await dashboardContract.getRecentActivityLogs(limit);
    
    return NextResponse.json({
      success: true,
      data: activity.map(log => ({
        timestamp: Number(log.timestamp),
        actor: log.actor,
        action: log.action,
        aadhaar: Number(log.aadhaar),
        tokenId: Number(log.tokenId),
        details: log.details
      }))
    });
  } catch (error) {
    console.error('Recent activity fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No recent activity data available - blockchain connection issue'
    });
  }
}

// Helper function to format consumer data
function formatConsumer(consumer) {
  return {
    aadhaar: Number(consumer.aadhaar),
    name: consumer.name,
    mobile: consumer.mobile,
    category: consumer.category,
    registrationTime: Number(consumer.registrationTime),
    assignedShopkeeper: consumer.assignedShopkeeper,
    totalTokensReceived: Number(consumer.totalTokensReceived),
    totalTokensClaimed: Number(consumer.totalTokensClaimed),
    lastTokenIssuedTime: Number(consumer.lastTokenIssuedTime),
    isActive: consumer.isActive,
    hasCurrentMonthToken: Number(consumer.lastTokenIssuedTime) > 0,
    availableTokens: Number(consumer.totalTokensReceived) - Number(consumer.totalTokensClaimed),
    shopkeeper: consumer.assignedShopkeeper === "0x0000000000000000000000000000000000000000" ? "Not Assigned" : "Assigned"
  };
}