import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import twilio from 'twilio';
import dbConnect from '@/lib/mongodb';
import connectDB from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';
import ShopkeeperSignupRequest from '@/models/ShopkeeperSignupRequest';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";
import Shopkeeper from '@/models/Shopkeeper';
import DeliveryRider from '@/models/DeliveryRider';

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

// Dashboard ABI - ALL functions now available in your deployed contract
const DASHBOARD_ABI = [
  "function getAdminDashboard() view returns (tuple(uint256 totalConsumers, uint256 totalShopkeepers, uint256 totalDeliveryAgents, uint256 totalTokensIssued, uint256 totalTokensClaimed, uint256 totalTokensExpired, uint256 pendingTokens, uint256 currentMonth, uint256 currentYear, uint256 lastUpdateTime))",
  "function getShopkeeperInfo(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))",
  "function getConsumersByShopkeeper(address shopkeeper) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function getTotalShopkeepers() view returns (uint256)",
  "function getTotalDeliveryAgents() view returns (uint256)",
  "function getTotalConsumers() view returns (uint256)",
  "function getCategoryWiseStats() view returns (string[] categories, uint256[] consumerCounts, uint256[] rationAmounts)",
  // NEW FUNCTIONS NOW AVAILABLE:
  "function getAllShopkeepers() view returns (address[])",
  "function getAreaWiseStats() view returns (string[] areas, uint256[] consumerCounts, uint256[] activeShopkeepers, uint256[] tokenDistributed)",
  "function getConsumersPaginated(uint256 offset, uint256 limit) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[] consumerList, uint256 total)",
  "function searchConsumersByName(string name) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function getConsumersNeedingEmergencyHelp() view returns (uint256[])",
  "function getShopkeeperDashboard(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))",
  "function getDeliveryAgentDashboard(address agent) view returns (tuple(address agentAddress, string agentName, string mobile, uint256 registrationTime, address assignedShopkeeper, uint256 totalDeliveries, bool isActive))"
];

// Use public RPC
const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");

// Contract address
const CONTRACT_ADDRESS = "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";

// Initialize contracts
let adminWallet, dashboardContract, tokenOpsContract, diamondContract;

try {
  adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY || "cc7a9fa8676452af481a0fd486b9e2f500143bc63893171770f4d76e7ead33ec",
    provider
  );

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

  // 🔥 GOD MODE: Bulletproof ABI processor that WILL work
  function getMergedABI() {
    try {
      console.log('� GOD MODE: Processing DiamondMergedABI structure...');

      let rawItems = [];

      // Extract ALL ABI items from abiMap
      if (DiamondMergedABI.abiMap && typeof DiamondMergedABI.abiMap === 'object') {
        console.log('📄 Using abiMap structure');
        Object.entries(DiamondMergedABI.abiMap).forEach(([contractName, abi]) => {
          if (Array.isArray(abi)) {
            console.log(`📄 Processing ${abi.length} items from ${contractName}`);
            rawItems.push(...abi);
          }
        });
      }

      console.log(`🔥 Extracted ${rawItems.length} raw ABI items`);

      // 🔥 NUCLEAR DEDUPLICATION - categorize and process systematically
      const deduplicated = [];
      const seenSignatures = new Set();

      // Only keep ONE constructor
      const constructors = rawItems.filter(item => item.type === 'constructor');
      if (constructors.length > 0) {
        console.log(`� Found ${constructors.length} constructors, keeping ONLY the first`);
        deduplicated.push(constructors[0]);
      }

      // Only keep ONE fallback
      const fallbacks = rawItems.filter(item => item.type === 'fallback');
      if (fallbacks.length > 0) {
        console.log(`� Found ${fallbacks.length} fallbacks, keeping ONLY the first`);
        deduplicated.push(fallbacks[0]);
      }

      // Only keep ONE receive
      const receives = rawItems.filter(item => item.type === 'receive');
      if (receives.length > 0) {
        console.log(`� Found ${receives.length} receives, keeping ONLY the first`);
        deduplicated.push(receives[0]);
      }

      // Process functions with signature-based deduplication
      const functions = rawItems.filter(item => item.type === 'function');
      console.log(`🔥 Processing ${functions.length} functions`);

      functions.forEach(func => {
        if (!func.name) return;

        const inputs = (func.inputs || []).map(input => input.type).join(',');
        const signature = `${func.name}(${inputs})`;

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          deduplicated.push(func);
        } else {
          console.log(`⚡ Skipping duplicate function: ${signature}`);
        }
      });

      // Process events
      const events = rawItems.filter(item => item.type === 'event');
      console.log(`🔥 Processing ${events.length} events`);

      events.forEach(event => {
        if (!event.name) return;

        const inputs = (event.inputs || []).map(input => input.type).join(',');
        const signature = `event:${event.name}(${inputs})`;

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          deduplicated.push(event);
        }
      });

      // Process errors
      const errors = rawItems.filter(item => item.type === 'error');
      console.log(`🔥 Processing ${errors.length} errors`);

      errors.forEach(error => {
        if (!error.name) return;

        const inputs = (error.inputs || []).map(input => input.type).join(',');
        const signature = `error:${error.name}(${inputs})`;

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          deduplicated.push(error);
        }
      });

      console.log(`� DEDUPLICATION COMPLETE: ${rawItems.length} → ${deduplicated.length} items`);

      // Verify our target function
      const targetFunction = deduplicated.find(item =>
        item.type === 'function' &&
        item.name === 'assignDeliveryAgentToShopkeeper'
      );

      console.log("🎯 Target function found:", !!targetFunction);
      if (targetFunction) {
        console.log("🎯 Function details:", {
          name: targetFunction.name,
          inputs: targetFunction.inputs?.map(i => `${i.name}: ${i.type}`),
          outputs: targetFunction.outputs?.map(o => o.type)
        });
      }

      // Final stats
      const stats = {
        functions: deduplicated.filter(i => i.type === 'function').length,
        events: deduplicated.filter(i => i.type === 'event').length,
        errors: deduplicated.filter(i => i.type === 'error').length,
        constructors: deduplicated.filter(i => i.type === 'constructor').length,
        fallbacks: deduplicated.filter(i => i.type === 'fallback').length,
        receives: deduplicated.filter(i => i.type === 'receive').length
      };

      console.log('🔥 FINAL ABI COMPOSITION:', stats);

      return deduplicated;

    } catch (error) {
      console.error('💀 GOD MODE FAILED:', error);
      throw error;
    }
  }

  // Deduplicate ABI functions based on function signature
  function deduplicateABI(abi) {
    const seenSignatures = new Set();
    const deduplicatedABI = [];
    let hasConstructor = false;
    let hasFallback = false;
    let hasReceive = false;

    for (const item of abi) {
      if (item.type === 'function') {
        // Create a signature string for the function
        const inputs = item.inputs || [];
        const inputTypes = inputs.map(input => input.type).join(',');
        const signature = `${item.name}(${inputTypes})`;

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          deduplicatedABI.push(item);
        } else {
          console.log(`Skipping duplicate function: ${signature}`);
        }
      } else if (item.type === 'event' || item.type === 'error') {
        // For events and errors, also check for duplicates
        const inputs = item.inputs || [];
        const inputTypes = inputs.map(input => input.type).join(',');
        const signature = `${item.type}:${item.name}(${inputTypes})`;

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          deduplicatedABI.push(item);
        } else {
          console.log(`Skipping duplicate ${item.type}: ${item.name}`);
        }
      } else if (item.type === 'constructor') {
        // Only keep one constructor
        if (!hasConstructor) {
          hasConstructor = true;
          deduplicatedABI.push(item);
        } else {
          console.log('Skipping duplicate constructor');
        }
      } else if (item.type === 'fallback') {
        // Only keep one fallback
        if (!hasFallback) {
          hasFallback = true;
          deduplicatedABI.push(item);
        } else {
          console.log('Skipping duplicate fallback');
        }
      } else if (item.type === 'receive') {
        // Only keep one receive
        if (!hasReceive) {
          hasReceive = true;
          deduplicatedABI.push(item);
        } else {
          console.log('Skipping duplicate receive');
        }
      } else {
        // For other types, add directly (but this shouldn't happen in a well-formed ABI)
        console.log(`Adding unknown ABI type: ${item.type}`);
        deduplicatedABI.push(item);
      }
    }

    console.log(`✅ Deduplication complete: ${abi.length} → ${deduplicatedABI.length} items`);
    return deduplicatedABI;
  }

  try {
    const mergedABI = getMergedABI();
    console.log('🔥 GOD MODE: ABI processing complete, creating contract...');

    // Log specific function availability before creating contract
    const hasAssignFunction = mergedABI.some(item =>
      item.type === 'function' &&
      item.name === 'assignDeliveryAgentToShopkeeper'
    );
    console.log('🎯 assignDeliveryAgentToShopkeeper available in ABI:', hasAssignFunction);

    // Log ABI statistics before contract creation
    const abiStats = {
      totalItems: mergedABI.length,
      functions: mergedABI.filter(item => item.type === 'function').length,
      events: mergedABI.filter(item => item.type === 'event').length,
      constructors: mergedABI.filter(item => item.type === 'constructor').length,
      fallbacks: mergedABI.filter(item => item.type === 'fallback').length,
      receives: mergedABI.filter(item => item.type === 'receive').length
    };
    console.log('📊 Final ABI stats:', abiStats);

    console.log('🔥 GOD MODE: Creating ethers contract with cleaned ABI...');

    try {
      // Create contract with bulletproof error handling
      diamondContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        mergedABI,
        adminWallet
      );

      console.log('🔥 Contract object created successfully');

      // Verify contract interface (ethers.js v6 uses fragments, not functions)
      if (!diamondContract.interface) {
        throw new Error('Contract interface is null');
      }

      // In ethers.js v6, functions are accessed via interface.fragments or getFunction()
      if (!diamondContract.interface.fragments) {
        console.error('❌ Contract interface.fragments is null');
        console.error('Interface keys:', Object.keys(diamondContract.interface));
        throw new Error('Contract interface.fragments is null - ABI structure problem');
      }

      const functionFragments = diamondContract.interface.fragments.filter(f => f.type === 'function');
      const functionCount = functionFragments.length;
      console.log(`🔥 Contract interface initialized with ${functionCount} functions`);

      // Verify our target function exists in the interface
      const hasTargetFunction = functionFragments.some(f =>
        f.name === 'assignDeliveryAgentToShopkeeper'
      );

      console.log('🎯 assignDeliveryAgentToShopkeeper in interface:', hasTargetFunction);

      if (hasTargetFunction) {
        try {
          const targetFunction = diamondContract.interface.getFunction('assignDeliveryAgentToShopkeeper');
          console.log('🎯 Function details:', {
            name: targetFunction.name,
            inputs: targetFunction.inputs.map(i => `${i.name}: ${i.type}`),
            selector: targetFunction.selector
          });
        } catch (e) {
          console.log('🎯 Could not get function details:', e.message);
        }
      }

      console.log('🔥 GOD MODE SUCCESS: Diamond contract fully initialized!');

    } catch (contractError) {
      console.error('💀 Contract creation failed:', contractError);
      throw new Error(`Contract creation failed: ${contractError.message}`);
    }

    console.log('✅ Contract interface created successfully');
    const functionFragments = diamondContract.interface.fragments.filter(f => f.type === 'function');
    console.log('Contract interface functions count:', functionFragments.length);

    // Verify the specific function exists in the contract interface
    const contractFunctions = functionFragments.map(f => f.name);
    const hasAssignInInterface = contractFunctions.some(fn =>
      fn.includes('assignDeliveryAgentToShopkeeper')
    );
    console.log('🎯 assignDeliveryAgentToShopkeeper available in contract interface:', hasAssignInInterface);

    // List all delivery-related functions in the interface
    const deliveryFuncsInInterface = contractFunctions.filter(fn =>
      fn.toLowerCase().includes('delivery') ||
      fn.toLowerCase().includes('agent') ||
      fn.toLowerCase().includes('assign')
    );
    console.log('🚚 Delivery functions in contract interface:', deliveryFuncsInInterface);

    console.log('Blockchain components initialized successfully');
    console.log('Admin wallet address:', adminWallet.address);
    console.log('Contract address:', CONTRACT_ADDRESS);
    console.log('Diamond contract functions available:', mergedABI.length);
  } catch (contractError) {
    console.error('❌ Failed to create diamond contract:', contractError);
    console.log('Falling back to tokenOpsContract for token operations');
    diamondContract = null; // Set to null so we can check and use fallback
  }

  // Only log debugging info if contract was created successfully
  if (diamondContract && diamondContract.interface && diamondContract.interface.fragments) {
    const functionFragments = diamondContract.interface.fragments.filter(f => f.type === 'function');
    const hasMonthlyTokens = functionFragments.some(f => f.name === 'generateMonthlyTokensForAll');
    const hasCategoryTokens = functionFragments.some(f => f.name === 'generateTokensForCategory');

    console.log('generateMonthlyTokensForAll available on contract:', hasMonthlyTokens);
    console.log('generateTokensForCategory available on contract:', hasCategoryTokens);
    console.log('Total contract interface functions:', functionFragments.length);
  } else {
    console.log('⚠️ Diamond contract interface not available, will use fallback tokenOpsContract');
  }

  // Also verify tokenOpsContract is available as fallback
  if (tokenOpsContract) {
    console.log('✅ TokenOpsContract available as fallback');
  } else {
    console.log('❌ TokenOpsContract not available');
  }

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

    if (message.length > 160) {
      console.warn(`⚠️ Message too long (${message.length} chars), truncating...`);
      message = message.substring(0, 157) + '...';
    }

    let formattedNumber = phoneNumber.toString().replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = '+91' + formattedNumber;
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+91' + formattedNumber;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log('✅ SMS sent successfully:', result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
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
  return `🍚 GRAINLY: ${consumerName}, your ${category} ration token #${tokenId} is ready! Collect ${rationAmount}kg from ${shopkeeperName}, ${shopkeeperArea}. Valid till month end.`;
}

function createShortSMSMessage(consumerName, tokenId, category) {
  return `GRAINLY: ${consumerName}, token #${tokenId} ready. Collect your ${category} ration now!`;
}

async function sendSMSToConsumer(consumer, actualTokenId = null) {
  try {
    const shopkeeper = await getShopkeeperDetails(consumer.assignedShopkeeper);

    // Use actual token ID if provided, otherwise get latest token for consumer
    let tokenId = actualTokenId;
    if (!tokenId) {
      try {
        // Get the consumer's unclaimed tokens to find the latest one
        const unclaimedTokens = await dashboardContract.getUnclaimedTokensByAadhaar(consumer.aadhaar);
        if (unclaimedTokens && unclaimedTokens.length > 0) {
          // Use the latest token (last in array)
          tokenId = Number(unclaimedTokens[unclaimedTokens.length - 1]);
        } else {
          // Fallback: use a simple token reference
          tokenId = `T-${consumer.aadhaar.toString().slice(-4)}`;
        }
      } catch (error) {
        console.error('Failed to get unclaimed tokens, using fallback token ID');
        tokenId = `T-${consumer.aadhaar.toString().slice(-4)}`;
      }
    }

    const message = createSMSMessage(
      consumer.name,
      tokenId,
      shopkeeper.name,
      shopkeeper.area,
      consumer.category,
      5
    );

    let finalMessage = message;
    if (message.length > 160) {
      finalMessage = createShortSMSMessage(consumer.name, tokenId, consumer.category);
    }

    const result = await sendSMSNotification(consumer.mobile, finalMessage);

    if (result.success) {
      console.log(`✅ SMS sent to ${consumer.name} (${consumer.mobile}) with token ID: ${tokenId}`);
    } else {
      console.error(`❌ SMS failed for ${consumer.name}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending SMS to consumer:', error);
    return { success: false, error: error.message };
  }
}

function formatConsumerBasic(consumer) {
  return {
    aadhaar: Number(consumer.aadhaar),
    name: consumer.name,
    mobile: consumer.mobile,
    category: consumer.category,
    assignedShopkeeper: consumer.assignedShopkeeper
  };
}

async function sendSMSNotifications(operationType, category = null, aadhaarList = null) {
  try {
    console.log(`📱 Starting SMS notifications for ${operationType}...`);

    let consumersToNotify = [];

    if (operationType === 'individual' && aadhaarList && aadhaarList.length > 0) {
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
      try {
        const consumers = await dashboardContract.getConsumersByCategory(category);
        consumersToNotify = consumers.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get category consumers:', error);
      }
    } else if (operationType === 'monthly') {
      try {
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        consumersToNotify = result.consumerList.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get all consumers:', error);
      }
    }

    console.log(`Found ${consumersToNotify.length} consumers to notify`);

    let smsCount = 0;
    for (const consumer of consumersToNotify) {
      try {
        // Use the improved sendSMSToConsumer that gets real token IDs
        await sendSMSToConsumer(consumer);
        smsCount++;
        console.log(`SMS ${smsCount}/${consumersToNotify.length} sent to ${consumer.name}`);

        // Add delay between SMS to avoid rate limiting
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
      case 'dashboard-stats':
        return await handleDashboard();
      case 'consumers':
      case 'get-consumers':
        return await handleConsumers(searchParams);
      case 'shopkeepers':
      case 'get-shopkeepers':
        return await handleShopkeepers();
      case 'delivery-agents':
      case 'get-delivery-agents':
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
      case 'payment-analytics':
        return await handlePaymentAnalytics();
      case 'system-settings':
        return await handleSystemSettings();
      case 'test-connection':
        return await handleTestConnection();
      case 'system-status':
        return await handleSystemStatus();
      case 'pickup-statistics':
        return await handlePickupStatistics();
      case 'all-pickups':
        return await handleAllPickups();
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

// POST request handler
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
      case 'bulk-generate-tokens':
        return await handleBulkGenerateTokens();
      case 'expire-old-tokens':
        return await handleExpireOldTokens();
      case 'pause-system':
        return await handlePauseSystem();
      case 'unpause-system':
        return await handleUnpauseSystem();
      case 'set-ration-price':
        return await handleSetRationPrice(body);
      case 'set-subsidy-percentage':
        return await handleSetSubsidyPercentage(body);
      case 'test-sms':
        return await handleTestSMS();
      case 'register-shopkeeper':
        return await handleRegisterShopkeeper(body);
      case 'assign-delivery-agent':
        return await handleAssignDeliveryAgentToOrder(body);
      case 'create-order':
        return await handleCreateOrder(body);
      case 'get-orders':
        return await handleGetOrders(body);
      case 'assign-agent-to-shopkeeper':
        return await handleAssignDeliveryAgent(body);
      case 'remove-delivery-agent':
        return await handleRemoveDeliveryAgent(body);
      case 'transfer-consumer':
        return await handleTransferConsumer(body);
      case 'update-consumer-category':
        return await handleUpdateConsumerCategory(body);
      case 'sync-consumer':
        return await handleSyncConsumer(body);
      case 'manual-sync-consumer':
        return await handleManualSyncConsumer(body);
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

async function handleGenerateMonthlyTokens() {
  try {
    console.log('🚀 Generating monthly tokens for all consumers...');

    // Use DCVToken contract directly since it has mintTokenForAadhaar function
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    // Load DCVToken ABI directly from DCVToken.json
    const DCVTokenABI = require('../../../../abis/DCVToken.json');

    console.log('✅ DCVToken ABI loaded, functions count:', DCVTokenABI.length);

    const dcvTokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS, // 0xC336869ac6f9D51888ab27615a086524C281D3Aa
      DCVTokenABI,
      wallet
    );

    console.log('✅ DCVToken contract initialized:', process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS);

    // Get all consumers from the Diamond contract
    let allConsumers = [];
    try {
      if (diamondContract) {
        console.log('📋 Fetching all consumers from Diamond contract...');
        const consumers = await diamondContract.getAllConsumers();
        allConsumers = consumers || [];
        console.log(`✅ Found ${allConsumers.length} consumers`);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch consumers from Diamond contract:', error.message);
      // Fallback: use a test consumer for demonstration
      allConsumers = [
        {
          aadhaar: BigInt("123456789012"),
          assignedShopkeeper: "0x0000000000000000000000000000000000000000",
          category: "BPL"
        }
      ];
    }

    if (allConsumers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No consumers found to generate tokens for'
      });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    console.log(`🎯 Processing ${allConsumers.length} consumers for month ${currentMonth}/${currentYear}`);

    for (let i = 0; i < allConsumers.length; i++) {
      const consumer = allConsumers[i];
      try {
        const aadhaar = BigInt(consumer.aadhaar || consumer[0]);
        const assignedShopkeeper = consumer.assignedShopkeeper || consumer[4] || "0x0000000000000000000000000000000000000000";
        const category = consumer.category || consumer[3] || "BPL";

        console.log(`📦 Processing consumer ${i + 1}/${allConsumers.length}: ${aadhaar}`);

        // Check if consumer already has token for this month
        const hasToken = await dcvTokenContract.hasTokensForMonth(aadhaar, currentMonth, currentYear);

        if (hasToken) {
          console.log(`⏭️ Consumer ${aadhaar} already has token for this month, skipping`);
          skippedCount++;
          continue;
        }

        // Mint token for this consumer
        const tx = await dcvTokenContract.mintTokenForAadhaar(
          aadhaar,
          assignedShopkeeper,
          5, // 5kg default ration amount
          category
        );

        console.log(`📤 Token mint transaction sent for ${aadhaar}: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          successCount++;
          console.log(`✅ Token minted successfully for consumer ${aadhaar}`);
        } else {
          errorCount++;
          console.log(`❌ Token mint failed for consumer ${aadhaar}`);
        }

        // Add small delay to avoid overwhelming the network
        if (i < allConsumers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Failed to mint token for consumer ${consumer.aadhaar}:`, error);
        errorCount++;
        errors.push(`Consumer ${consumer.aadhaar}: ${error.message}`);
      }
    }

    const summary = `Monthly tokens generated: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`;
    console.log('📊 Final summary:', summary);

    if (successCount > 0) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('monthly');
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
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

async function handleGenerateTokenForConsumer(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar } = body;

    if (!aadhaar) {
      throw new Error('Aadhaar number is required');
    }

    console.log(`🚀 Generating token for consumer: ${aadhaar}`);

    // Use diamondContract instead of tokenOpsContract
    const tx = await diamondContract.connect(adminWallet).generateTokenForConsumer(aadhaar, {
      gasLimit: 500000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      // Extract token ID from transaction logs/events
      let actualTokenId = null;
      try {
        // Look for TokenGenerated or similar events in the logs
        const tokenGeneratedEvents = receipt.logs.filter(log => {
          // Check if this looks like a token generation event
          return log.topics && log.topics.length > 0;
        });

        if (tokenGeneratedEvents.length > 0) {
          // Try to decode the event to get token ID
          // This is a simplified approach - you might need to adjust based on your contract's event structure
          const eventData = tokenGeneratedEvents[0];
          if (eventData.data && eventData.data !== '0x') {
            // Parse the token ID from event data (this might need adjustment based on your contract)
            try {
              const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], eventData.data);
              actualTokenId = Number(decodedData[0]);
              console.log('📋 Extracted token ID from event:', actualTokenId);
            } catch (decodeError) {
              console.warn('Could not decode token ID from event, will fetch from contract');
            }
          }
        }
      } catch (eventError) {
        console.warn('Could not extract token ID from events:', eventError.message);
      }

      setTimeout(async () => {
        try {
          const consumer = await getConsumerDetails(aadhaar);
          if (consumer) {
            await sendSMSToConsumer(consumer, actualTokenId);
            console.log('📱 SMS notification sent with actual token ID');
          }
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
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

async function handleGenerateTokensForCategory(body) {
  try {
    const { category } = body;
    if (!category) {
      throw new Error('Category is required');
    }

    console.log(`🎯 Generating tokens for category: ${category}`);

    // Use DCVToken contract directly since it has mintTokenForAadhaar function
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    // Load DCVToken ABI directly from DCVToken.json
    const DCVTokenABI = require('../../../../abis/DCVToken.json');

    console.log('✅ DCVToken ABI loaded for category generation, functions count:', DCVTokenABI.length);

    const dcvTokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS,
      DCVTokenABI,
      wallet
    );

    console.log('✅ DCVToken contract initialized for category generation');

    // Get consumers of this category from Diamond contract
    let categoryConsumers = [];
    try {
      if (diamondContract) {
        console.log(`📋 Fetching consumers for category: ${category}`);
        const allConsumers = await diamondContract.getAllConsumers();
        categoryConsumers = allConsumers.filter(consumer => {
          const consumerCategory = consumer.category || consumer[3] || "BPL";
          return consumerCategory === category;
        });
        console.log(`✅ Found ${categoryConsumers.length} consumers in ${category} category`);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch consumers from Diamond contract:', error.message);
      // Return error since we need consumers for category generation
      return NextResponse.json({
        success: false,
        error: `Could not fetch consumers for category ${category}: ${error.message}`
      });
    }

    if (categoryConsumers.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No consumers found in ${category} category`
      });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    console.log(`🎯 Processing ${categoryConsumers.length} consumers in ${category} category`);

    for (let i = 0; i < categoryConsumers.length; i++) {
      const consumer = categoryConsumers[i];
      try {
        const aadhaar = BigInt(consumer.aadhaar || consumer[0]);
        const assignedShopkeeper = consumer.assignedShopkeeper || consumer[4] || "0x0000000000000000000000000000000000000000";

        console.log(`📦 Processing consumer ${i + 1}/${categoryConsumers.length}: ${aadhaar}`);

        // Check if consumer already has token for this month
        const hasToken = await dcvTokenContract.hasTokensForMonth(aadhaar, currentMonth, currentYear);
        if (hasToken) {
          console.log(`⏭️ Consumer ${aadhaar} already has token for this month, skipping`);
          skippedCount++;
          continue;
        }

        // Mint token for this consumer
        const tx = await dcvTokenContract.mintTokenForAadhaar(
          aadhaar,
          assignedShopkeeper,
          5, // 5kg default ration amount
          category
        );

        console.log(`📤 Token mint transaction sent for ${aadhaar}: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          successCount++;
          console.log(`✅ Token minted successfully for consumer ${aadhaar}`);
        } else {
          errorCount++;
          console.log(`❌ Token mint failed for consumer ${aadhaar}`);
        }

        // Add small delay to avoid overwhelming the network
        if (i < categoryConsumers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to mint token for consumer ${consumer.aadhaar}:`, error);
        errorCount++;
        errors.push(`Consumer ${consumer.aadhaar}: ${error.message}`);
      }
    }

    const summary = `${category} category tokens generated: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`;
    console.log('📊 Category generation summary:', summary);

    // Send SMS notifications if successful
    if (successCount > 0) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('category', category);
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }

    return NextResponse.json({
      success: true,
      txHash: successCount > 0 ? 'batch_operation' : 'no_transactions',
      polygonScanUrl: `https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS}`,
      message: summary,
      details: {
        category,
        totalConsumers: categoryConsumers.length,
        successCount,
        errorCount,
        skippedCount,
        errors: errors.slice(0, 5) // Show first 5 errors only
      }
    });
  } catch (error) {
    console.error('Category tokens generation error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate category tokens: ${error.message}`
    }, { status: 500 });
  }
}

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

async function handleDashboard() {
  try {
    console.log('Fetching dashboard data...');

    if (!dashboardContract) {
      console.error('Dashboard contract not initialized');
      throw new Error('Dashboard contract not initialized');
    }

    console.log('Calling getAdminDashboard() on contract...');
    const dashboardData = await dashboardContract.getAdminDashboard();
    console.log('Raw dashboard data from blockchain:', dashboardData);

    const processedData = {
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
    };

    console.log('Processed dashboard data:', processedData);

    // Verify the data by cross-checking with individual functions
    try {
      const totalConsumersCheck = await dashboardContract.getTotalConsumers();
      const actualConsumers = Number(totalConsumersCheck);

      if (actualConsumers === 0 && processedData.totalConsumers > 0) {
        console.log('⚠️ Dashboard shows consumers but getTotalConsumers returns 0 - using conservative data');
        processedData.totalConsumers = 0;
      }
    } catch (checkError) {
      console.log('Could not verify consumer count:', checkError.message);
    }

    return NextResponse.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    // Return actual zeros instead of fallback data to show real state
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
      warning: `Blockchain connection failed: ${error.message}`,
      error: true
    });
  }
}

async function handleConsumers(searchParams) {
  try {
    console.log('Fetching consumers from blockchain...');

    if (!dashboardContract) {
      console.error('Dashboard contract not initialized');
      throw new Error('Dashboard contract not initialized');
    }

    const offset = parseInt(searchParams.get('offset') || searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    console.log(`Fetching consumers: offset=${offset}, limit=${limit}, category=${category}, search=${search}`);

    let consumers = [];
    let total = 0;

    if (search) {
      console.log('Searching consumers by name:', search);
      try {
        const searchResults = await dashboardContract.searchConsumersByName(search);
        console.log('Search results:', searchResults);
        consumers = searchResults.map(formatConsumer);
        total = consumers.length;
      } catch (searchError) {
        console.error('Search function failed:', searchError);
        // Fallback: get all consumers and filter locally
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        const allConsumers = result.consumerList.map(formatConsumer);
        consumers = allConsumers.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.aadhaar.toString().includes(search)
        );
        total = consumers.length;
      }
    } else if (category && category !== 'all') {
      console.log('Fetching consumers by category:', category);
      try {
        const categoryConsumers = await dashboardContract.getConsumersByCategory(category);
        console.log('Category consumers:', categoryConsumers);
        consumers = categoryConsumers.map(formatConsumer);
        total = consumers.length;
      } catch (categoryError) {
        console.error('Category function failed:', categoryError);
        // Fallback: get all consumers and filter by category
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        const allConsumers = result.consumerList.map(formatConsumer);
        consumers = allConsumers.filter(c => c.category === category);
        total = consumers.length;
      }
    } else {
      console.log('Fetching paginated consumers...');
      try {
        const result = await dashboardContract.getConsumersPaginated(offset, limit);
        console.log('Paginated result:', result);
        consumers = result.consumerList ? result.consumerList.map(formatConsumer) : [];
        total = Number(result.total || 0);

        console.log(`Found ${consumers.length} consumers, total: ${total}`);
      } catch (paginationError) {
        console.error('Pagination function failed:', paginationError);

        // Final fallback: try to get total consumers count
        try {
          const totalConsumers = await dashboardContract.getTotalConsumers();
          total = Number(totalConsumers);
          console.log(`Total consumers from blockchain: ${total}`);

          if (total > 0) {
            return NextResponse.json({
              success: true,
              data: [],
              total: total,
              pagination: {
                offset: Number(offset),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
              },
              warning: `Found ${total} consumers on blockchain, but getConsumersPaginated function is not available in the deployed contract. This might be a Diamond contract configuration issue.`,
              info: {
                suggestion: 'Try registering new consumers or check if the Diamond contract facets are properly deployed.',
                contractFunction: 'getConsumersPaginated',
                totalFound: total
              }
            });
          }
        } catch (totalError) {
          console.error('Even getTotalConsumers failed:', totalError);
        }

        // Return empty result with error info
        consumers = [];
        total = 0;
      }
    }

    const response = {
      success: true,
      data: consumers,
      total: total,
      pagination: {
        offset: Number(offset),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      },
      dataSource: 'blockchain',
      contractAddress: CONTRACT_ADDRESS,
      timestamp: new Date().toISOString()
    };

    if (consumers.length === 0 && total === 0) {
      response.warning = 'No consumers found on blockchain. This could mean no consumers are registered yet, or there might be a contract configuration issue.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Consumers fetch error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
      pagination: {
        offset: 0,
        limit: 50,
        totalPages: 0
      },
      warning: `Blockchain connection issue: ${error.message}. This might be because no consumers are registered yet, or there's a contract deployment issue.`,
      error: true,
      errorDetails: {
        message: error.message,
        code: error.code,
        suggestion: 'Try registering a consumer first through the consumer signup page, or check if the contract is properly deployed.'
      }
    });
  }
}

export async function handleShopkeepers() {
  ;
  try {
    console.log("🏪 Fetching shopkeepers from blockchain...");

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    try {
      // Get all shopkeeper addresses from blockchain
      const shopkeeperAddresses = await contract.getAllShopkeepers();
      console.log(`✅ Found ${shopkeeperAddresses.length} shopkeepers on blockchain`);

      // Fetch detailed info for each shopkeeper
      const shopkeepers = [];
      for (const address of shopkeeperAddresses) {
        try {
          const info = await contract.getShopkeeperInfo(address);
          shopkeepers.push({
            shopkeeperAddress: info.shopkeeperAddress,
            name: info.name,
            area: info.area,
            mobile: "Available via blockchain",
            registrationTime: Number(info.registrationTime),
            totalConsumersAssigned: Number(info.totalConsumersAssigned),
            totalTokensIssued: Number(info.totalTokensIssued),
            totalDeliveries: Number(info.totalDeliveries),
            isActive: info.isActive,
            dataSource: "blockchain",
          });
        } catch (error) {
          console.error(`Error getting info for shopkeeper ${address}:`, error);
        }
      }
      await connectDB(); // ensure DB connection
      await Shopkeeper.insertMany(shopkeepers, { ordered: false });

      console.log(`🎉 Successfully fetched ${shopkeepers.length} shopkeepers from blockchain!`);

      return NextResponse.json({
        success: true,
        data: shopkeepers,
        dataSource: "blockchain",
        message: `Found ${shopkeepers.length} shopkeepers from blockchain`,
        info: {
          totalOnBlockchain: shopkeeperAddresses.length,
          successfullyFetched: shopkeepers.length,
          note: "Data fetched directly from blockchain using getAllShopkeepers()",
        },
      });
    } catch (blockchainError) {
      console.log("❌ getAllShopkeepers failed:", blockchainError.message);

      const shopkeeperRequests = await ShopkeeperSignupRequest.find({ status: "approved" })
        .sort({ createdAt: -1 })
        .lean();

      const shopkeepers = shopkeeperRequests.map((request) => ({
        shopkeeperAddress: request.walletAddress,
        name: request.name || "Unknown",
        area: request.area || "Unknown",
        mobile: request.mobile || "Not provided",
        registrationTime: Math.floor(new Date(request.updatedAt).getTime() / 1000),
        totalConsumersAssigned: 0,
        totalTokensIssued: 0,
        totalDeliveries: 0,
        isActive: true,
        dataSource: "database",
      }));

      return NextResponse.json({
        success: true,
        data: shopkeepers,
        dataSource: "database",
        message: `Found ${shopkeepers.length} shopkeepers from database`,
        blockchainError: blockchainError.message,
        info: {
          note: "Blockchain function failed, using database fallback",
          totalInDatabase: shopkeepers.length,
        },
      });
    }
  } catch (error) {
    console.error("Shopkeepers fetch error:", error);

    return NextResponse.json({
      success: false,
      data: [],
      error: `Failed to fetch shopkeepers: ${error.message}`,
    });
  }
}

// SINGLE handleDeliveryAgents function - Now using getAllDeliveryAgents from blockchain
async function handleDeliveryAgents() {
  try {
    console.log('🚚 Fetching delivery agents from blockchain...');

    // Try blockchain first with the new getAllDeliveryAgents function
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    let blockchainAgents = [];

    // Since getAllDeliveryAgents doesn't exist in the ABI, we'll get agent addresses from database
    // and then fetch their details from blockchain using getDeliveryAgentDashboard
    console.log('🔍 Getting delivery agent addresses from database first...');

    await dbConnect();
    const approvedPartners = await DeliverySignupRequest.find({
      status: 'approved'
    }).select('name phone walletAddress vehicleType licenseNumber reviewedAt blockchainTxHash');

    console.log(`📋 Found ${approvedPartners.length} approved agents in database`);

    // For each approved agent, try to get their blockchain details
    for (const partner of approvedPartners) {
      try {
        console.log(`🔍 Fetching blockchain details for ${partner.name} (${partner.walletAddress})`);
        const agentInfo = await contract.getDeliveryAgentDashboard(partner.walletAddress);

        blockchainAgents.push({
          agentAddress: agentInfo.agentAddress,
          name: agentInfo.agentName, // Note: it's agentName, not name in the ABI
          mobile: agentInfo.mobile,
          assignedShopkeeper: agentInfo.assignedShopkeeper,
          totalDeliveries: Number(agentInfo.totalDeliveries),
          registrationTime: Number(agentInfo.registrationTime),
          isActive: agentInfo.isActive,
          dataSource: 'blockchain',
          vehicleType: partner.vehicleType,
          licenseNumber: partner.licenseNumber
        });
        console.log(`✅ Successfully fetched blockchain details for ${agentInfo.agentName}`);
      } catch (infoError) {
        console.log(`⚠️ Could not get blockchain details for agent ${partner.walletAddress}, using database info:`, infoError.message);
        // Use database info as fallback
        blockchainAgents.push({
          agentAddress: partner.walletAddress,
          name: partner.name,
          mobile: partner.phone,
          assignedShopkeeper: '0x0000000000000000000000000000000000000000',
          totalDeliveries: 0,
          registrationTime: Math.floor(new Date(partner.reviewedAt).getTime() / 1000),
          isActive: true,
          dataSource: 'database',
          vehicleType: partner.vehicleType,
          licenseNumber: partner.licenseNumber,
          txHash: partner.blockchainTxHash
        });
      }
    }
    console.log(`🎉 Successfully processed ${blockchainAgents.length} agents!`);

    console.log(blockchainAgents);

    await dbConnect();
    await DeliveryRider.insertMany(blockchainAgents);

    console.log(`📊 Total agents processed: ${blockchainAgents.length}`);

    return NextResponse.json({
      success: true,
      data: blockchainAgents,
      metadata: {
        totalAgents: blockchainAgents.length,
        blockchainAgents: blockchainAgents.filter(a => a.dataSource === 'blockchain').length,
        databaseAgents: blockchainAgents.filter(a => a.dataSource === 'database').length,
        lastUpdated: new Date().toISOString(),
        note: 'Delivery agents fetched using database addresses with blockchain details'
      }
    });

  } catch (error) {
    console.error('❌ Delivery agents fetch error:', error);

    // Final fallback: Return only database data if everything fails
    try {
      await dbConnect();
      const fallbackPartners = await DeliverySignupRequest.find({
        status: 'approved'
      }).select('name phone walletAddress reviewedAt blockchainTxHash');

      return NextResponse.json({
        success: true,
        data: fallbackPartners.map(partner => ({
          agentAddress: partner.walletAddress,
          name: partner.name,
          mobile: partner.phone,
          assignedShopkeeper: '0x0000000000000000000000000000000000000000',
          totalDeliveries: 0,
          registrationTime: Math.floor(new Date(partner.reviewedAt).getTime() / 1000),
          isActive: true,
          dataSource: 'database_fallback',
          txHash: partner.blockchainTxHash
        })),
        warning: 'Using database fallback due to blockchain connection issues'
      });
    } catch (fallbackError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch delivery agents from any source',
        details: fallbackError.message
      }, { status: 500 });
    }
  }
}

async function handleAreaStats() {
  try {
    console.log('📍 Fetching area statistics from blockchain...');

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    const areaStats = await contract.getAreaWiseStats();

    const areas = areaStats.areas;
    const consumerCounts = areaStats.consumerCounts;
    const activeShopkeepers = areaStats.activeShopkeepers;
    const tokenDistributed = areaStats.tokenDistributed;

    const formattedStats = areas.map((area, index) => ({
      area,
      consumers: Number(consumerCounts[index]),
      shopkeepers: Number(activeShopkeepers[index]),
      tokensDistributed: Number(tokenDistributed[index])
    }));

    console.log(`✅ Successfully fetched area stats for ${formattedStats.length} areas`);

    return NextResponse.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Area stats fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No area statistics available - blockchain connection issue',
      error: error.message
    });
  }
}

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

async function handleEmergencyCases() {
  try {
    console.log('🚨 Fetching emergency cases from blockchain...');

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    const emergencyAadhaars = await contract.getConsumersNeedingEmergencyHelp();

    const emergencyConsumers = [];

    for (const aadhaar of emergencyAadhaars) {
      try {
        const consumer = await contract.getConsumerByAadhaar(aadhaar);
        emergencyConsumers.push(formatConsumer(consumer));
      } catch (error) {
        console.error(`Failed to fetch consumer ${aadhaar}:`, error);
      }
    }

    console.log(`✅ Found ${emergencyConsumers.length} consumers needing emergency help`);

    return NextResponse.json({
      success: true,
      data: emergencyConsumers
    });
  } catch (error) {
    console.error('Emergency cases fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No emergency cases data available - blockchain connection issue',
      error: error.message
    });
  }
}

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

async function handlePaymentAnalytics() {
  try {
    console.log('Fetching payment analytics...');

    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    // Get payment analytics from the blockchain
    try {
      const paymentData = await diamondContract.getPaymentAnalytics();

      return NextResponse.json({
        success: true,
        data: {
          totalPayments: Number(paymentData.totalPayments || 0),
          totalAmount: Number(paymentData.totalAmount || 0),
          pendingPayments: Number(paymentData.pendingPayments || 0),
          failedPayments: Number(paymentData.failedPayments || 0),
          successRate: Number(paymentData.successRate || 0),
          averagePayment: Number(paymentData.averagePayment || 0),
          monthlyGrowth: Number(paymentData.monthlyGrowth || 0),
          activeUsers: Number(paymentData.activeUsers || 0)
        }
      });
    } catch (contractError) {
      console.log('Contract method not available, returning zero data');
      // Return zero data if contract method is not available
      return NextResponse.json({
        success: true,
        data: {
          totalPayments: 0,
          totalAmount: 0,
          pendingPayments: 0,
          failedPayments: 0,
          successRate: 0,
          averagePayment: 0,
          monthlyGrowth: 0,
          activeUsers: 0
        },
        warning: 'Payment analytics not available - contract method not implemented'
      });
    }
  } catch (error) {
    console.error('Payment analytics fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function handleSystemSettings() {
  try {
    console.log('Fetching system settings...');

    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    try {
      // Get system settings from the blockchain
      const rationPrice = await diamondContract.getRationPrice();
      const subsidyPercentage = await diamondContract.getSubsidyPercentage();
      const isPaused = await diamondContract.paused();
      const dcvTokenAddress = await diamondContract.getDCVTokenAddress();

      return NextResponse.json({
        success: true,
        data: {
          rationPrice: Number(rationPrice) / 100, // Convert from wei/cents to rupees
          subsidyPercentage: Number(subsidyPercentage),
          isPaused: isPaused,
          dcvTokenAddress: dcvTokenAddress,
          paymentSystemEnabled: true // Assume enabled for now
        }
      });
    } catch (contractError) {
      console.log('Contract methods not available, returning default settings');
      return NextResponse.json({
        success: true,
        data: {
          rationPrice: 0,
          subsidyPercentage: 0,
          isPaused: false,
          dcvTokenAddress: '0x0000000000000000000000000000000000000000',
          paymentSystemEnabled: false
        },
        warning: 'System settings not available - contract methods not implemented'
      });
    }
  } catch (error) {
    console.error('System settings fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

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

async function handleBulkGenerateTokens() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Bulk generating tokens...');

    const tx = await diamondContract.bulkGenerateTokens({
      gasLimit: 3000000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('monthly');
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Bulk token generation completed successfully.'
    });
  } catch (error) {
    console.error('Bulk generate tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to bulk generate tokens: ${error.message}`
    }, { status: 500 });
  }
}

async function handleExpireOldTokens() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Expiring old tokens...');

    const tx = await diamondContract.expireOldTokens({
      gasLimit: 1000000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Old tokens expired successfully.'
    });
  } catch (error) {
    console.error('Expire old tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to expire old tokens: ${error.message}`
    }, { status: 500 });
  }
}

async function handlePauseSystem() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Pausing system...');

    const tx = await diamondContract.pause({
      gasLimit: 300000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'System paused successfully.'
    });
  } catch (error) {
    console.error('Pause system error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to pause system: ${error.message}`
    }, { status: 500 });
  }
}

async function handleUnpauseSystem() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Unpausing system...');

    const tx = await diamondContract.unpause({
      gasLimit: 300000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'System unpaused successfully.'
    });
  } catch (error) {
    console.error('Unpause system error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to unpause system: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSetRationPrice(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { price } = body;

    if (!price) {
      throw new Error('Price is required');
    }

    console.log(`🚀 Setting ration price to: ${price}`);

    // Convert price to appropriate units (assuming contract expects in cents/wei)
    const priceInCents = Math.round(parseFloat(price) * 100);

    const tx = await diamondContract.setRationPrice(priceInCents, {
      gasLimit: 300000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Ration price set to ₹${price} successfully.`
    });
  } catch (error) {
    console.error('Set ration price error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to set ration price: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSetSubsidyPercentage(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { percentage } = body;

    if (!percentage) {
      throw new Error('Subsidy percentage is required');
    }

    console.log(`🚀 Setting subsidy percentage to: ${percentage}%`);

    const tx = await diamondContract.setSubsidyPercentage(percentage, {
      gasLimit: 300000
    });

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Subsidy percentage set to ${percentage}% successfully.`
    });
  } catch (error) {
    console.error('Set subsidy percentage error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to set subsidy percentage: ${error.message}`
    }, { status: 500 });
  }
}

async function handleTestConnection() {
  try {
    console.log('Testing blockchain connection...');

    const connectionStatus = {
      provider: !!provider,
      dashboardContract: !!dashboardContract,
      diamondContract: !!diamondContract,
      adminWallet: !!adminWallet,
      contractAddress: dashboardContract?.target || 'Not set',
      walletAddress: adminWallet?.address || 'Not set',
      network: 'Polygon Amoy Testnet',
      rpcUrl: 'https://rpc-amoy.polygon.technology'
    };

    console.log('Connection status:', connectionStatus);

    // Test if we can call a simple method
    try {
      const network = await provider.getNetwork();
      connectionStatus.networkId = network.chainId.toString();
      connectionStatus.networkName = network.name;

      // Test contract call
      const blockNumber = await provider.getBlockNumber();
      connectionStatus.latestBlock = blockNumber;
      connectionStatus.contractCallTest = 'Success';
    } catch (networkError) {
      console.error('Network test failed:', networkError);
      connectionStatus.contractCallTest = `Failed: ${networkError.message}`;
    }

    return NextResponse.json({
      success: true,
      data: connectionStatus
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        provider: false,
        dashboardContract: false,
        diamondContract: false,
        adminWallet: false,
        contractCallTest: 'Failed'
      }
    });
  }
}

async function handleRegisterShopkeeper(body) {
  try {
    const { shopkeeperAddress, name, area } = body;

    // Validate required fields
    if (!shopkeeperAddress || !name || !area) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: shopkeeperAddress, name, area' },
        { status: 400 }
      );
    }

    // Validate shopkeeper address format
    if (!ethers.isAddress(shopkeeperAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shopkeeper address format' },
        { status: 400 }
      );
    }

    console.log('🏪 Registering shopkeeper on blockchain:', {
      shopkeeperAddress,
      name,
      area
    });

    if (!diamondContract) {
      return NextResponse.json(
        { success: false, error: 'Diamond contract not initialized' },
        { status: 500 }
      );
    }

    console.log('📝 Calling registerShopkeeper function...');

    // Register shopkeeper on blockchain
    const tx = await diamondContract.registerShopkeeper(
      shopkeeperAddress,
      name,
      area
    );

    console.log('⏳ Transaction submitted:', tx.hash);
    console.log('⏳ Waiting for transaction confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    // Generate PolygonScan URL
    const polygonScanUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;

    // Send SMS notification if possible
    try {
      await sendSMSNotification(
        '+1234567890', // You might want to add phone number to shopkeeper registration
        `🏪 Shopkeeper Registration: ${name} has been successfully registered at ${area}. Wallet: ${shopkeeperAddress}`
      );
    } catch (smsError) {
      console.log('SMS notification failed:', smsError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Shopkeeper registered successfully',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      polygonScanUrl,
      shopkeeper: {
        address: shopkeeperAddress,
        name,
        area
      }
    });

  } catch (error) {
    console.error('❌ Shopkeeper registration failed:', error);

    // Handle specific blockchain errors
    if (error.code === 'CALL_EXCEPTION') {
      return NextResponse.json(
        {
          success: false,
          error: 'Smart contract call failed - shopkeeper may already be registered or invalid parameters',
          details: error.reason || error.message
        },
        { status: 400 }
      );
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient funds for gas fees',
          details: 'Admin wallet needs more MATIC for transaction fees'
        },
        { status: 400 }
      );
    }

    if (error.code === 'NETWORK_ERROR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Network connection failed',
          details: 'Unable to connect to Polygon network'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register shopkeeper: ' + error.message,
        details: error.code || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleAssignDeliveryAgent(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { shopkeeperAddress, deliveryAgentAddress } = body;

    if (!shopkeeperAddress || !deliveryAgentAddress) {
      throw new Error('Shopkeeper address and delivery agent address are required');
    }

    console.log(`🚀 Assigning delivery agent ${deliveryAgentAddress} to shopkeeper ${shopkeeperAddress} - with enhanced discovery`);

    // Skip pre-flight checks since many functions are not deployed
    console.log('⚠️ Skipping pre-flight checks due to missing facet functions - proceeding with facet discovery');

    // Diamond Facet Function Discovery System
    console.log('🔍 Starting Diamond facet function discovery...');

    const assignmentFunctionNames = [
      'assignDeliveryAgentToShopkeeper', // This is the correct one for shopkeeper assignment
      // 'assignDeliveryAgent' - This is for order assignment, different parameters
    ];

    // Get ABI functions with their selectors
    const abiFragments = diamondContract.interface.fragments.filter(f => f.type === 'function');
    const abiFunctionMap = new Map();

    for (const fragment of abiFragments) {
      if (assignmentFunctionNames.includes(fragment.name)) {
        const selector = diamondContract.interface.getFunction(fragment.name).selector;
        abiFunctionMap.set(fragment.name, {
          fragment,
          selector,
          signature: fragment.format()
        });
        console.log(`📋 Found assignment function in ABI: ${fragment.name} (${selector})`);
        console.log(`📝 Function signature: ${fragment.format()}`);
      }
    }

    console.log(`🎯 Found ${abiFunctionMap.size} assignment functions in ABI`);

    let assignmentResult = null;
    let successfulFunction = null;

    // Try each function with proper error handling
    for (const [funcName, funcInfo] of abiFunctionMap) {
      try {
        console.log(`🚀 Attempting to call ${funcName} with selector ${funcInfo.selector}...`);

        // Use ethers callStatic first to test if function exists and would succeed
        console.log(`🧪 Testing ${funcName} with callStatic...`);
        await diamondContract.callStatic[funcName](deliveryAgentAddress, shopkeeperAddress);
        console.log(`✅ callStatic test passed for ${funcName}`);

        // If callStatic succeeds, make the actual transaction
        console.log(`� Executing ${funcName} transaction...`);
        const tx = await diamondContract[funcName](
          deliveryAgentAddress,
          shopkeeperAddress,
          {
            gasLimit: 500000
          }
        );

        assignmentResult = tx;
        successfulFunction = funcName;
        console.log(`✅ Successfully called ${funcName}, tx: ${tx.hash}`);
        break;

      } catch (error) {
        console.log(`❌ ${funcName} failed:`, error.message);

        // Check specific error types
        if (error.message.includes('Diamond: Function does not exist')) {
          console.log(`🔍 Function ${funcName} not deployed in any facet`);
        } else if (error.message.includes('execution reverted')) {
          console.log(`⚠️ Function ${funcName} exists but reverted:`, error.reason || error.message);
        } else {
          console.log(`🔧 Other error for ${funcName}:`, error.message);
        }
        continue;
      }
    }

    if (!assignmentResult) {
      // Enhanced facet discovery using DiamondLoupeFacet
      console.log('🔍 Attempting enhanced facet discovery...');

      try {
        // Get all deployed facets
        const facets = await diamondContract.facets();
        console.log(`📋 Found ${facets.length} deployed facets:`);

        for (let i = 0; i < facets.length; i++) {
          const facet = facets[i];
          console.log(`  Facet ${i + 1}: ${facet.facetAddress} with ${facet.functionSelectors.length} functions`);

          // Check if any assignment function selector matches this facet
          for (const [funcName, funcInfo] of abiFunctionMap) {
            if (facet.functionSelectors.includes(funcInfo.selector)) {
              console.log(`✅ Found ${funcName} (${funcInfo.selector}) in facet ${facet.facetAddress}`);

              // Try calling the function directly on this facet
              try {
                console.log(`🎯 Attempting direct facet call to ${funcName} on ${facet.facetAddress}`);

                // Create a contract instance for the specific facet
                const facetContract = new ethers.Contract(
                  facet.facetAddress,
                  [funcInfo.fragment],
                  adminWallet
                );

                // Test with callStatic first
                console.log(`🧪 Testing direct facet callStatic for ${funcName}...`);
                await facetContract.callStatic[funcName](deliveryAgentAddress, shopkeeperAddress);
                console.log(`✅ Direct facet callStatic passed for ${funcName}`);

                // Execute the transaction
                console.log(`📤 Executing direct facet transaction for ${funcName}...`);
                const tx = await facetContract[funcName](
                  deliveryAgentAddress,
                  shopkeeperAddress,
                  {
                    gasLimit: 500000
                  }
                );

                assignmentResult = tx;
                successfulFunction = funcName;
                console.log(`✅ Successfully called ${funcName} directly on facet ${facet.facetAddress}, tx: ${tx.hash}`);
                break;

              } catch (facetError) {
                console.log(`❌ Direct facet call failed for ${funcName}:`, facetError.message);

                if (facetError.message.includes('execution reverted')) {
                  console.log(`⚠️ Direct facet call reverted: ${facetError.reason || facetError.message}`);
                }
              }
            }
          }

          if (assignmentResult) break;
        }

        // Get all facet addresses
        const facetAddresses = await diamondContract.facetAddresses();
        console.log('📍 All facet addresses:', facetAddresses);

      } catch (loupeError) {
        console.log('⚠️ DiamondLoupe functions not available:', loupeError.message);
      }

      const availableFunctions = Object.getOwnPropertyNames(diamondContract).filter(name =>
        typeof diamondContract[name] === 'function' && !name.startsWith('_')
      );

      // Try raw function calls with selectors as final attempt
      if (!assignmentResult) {
        console.log('🔧 Final attempt: Raw function calls with selectors...');

        for (const [funcName, funcInfo] of abiFunctionMap) {
          try {
            console.log(`🎯 Raw call to ${funcName} with selector ${funcInfo.selector}`);

            // Encode function call data manually
            const functionData = diamondContract.interface.encodeFunctionData(
              funcName,
              [deliveryAgentAddress, shopkeeperAddress]
            );

            console.log(`📤 Encoded function data: ${functionData}`);

            // Use low-level call to Diamond proxy
            const tx = await adminWallet.sendTransaction({
              to: diamondContract.address,
              data: functionData,
              gasLimit: 500000
            });

            assignmentResult = tx;
            successfulFunction = funcName;
            console.log(`✅ Successfully called ${funcName} via raw selector, tx: ${tx.hash}`);
            break;

          } catch (rawError) {
            console.log(`❌ Raw call failed for ${funcName}:`, rawError.message);

            if (rawError.message.includes('Diamond: Function does not exist')) {
              console.log(`🔍 Selector ${funcInfo.selector} not found in Diamond`);
            } else if (rawError.message.includes('execution reverted')) {
              console.log(`⚠️ Raw call reverted: ${rawError.reason || rawError.message}`);
            }
          }
        }
      }
    }

    // Final check - if nothing worked, throw error
    if (!assignmentResult) {
      console.error('❌ All assignment functions failed');
      console.error('📋 Available contract functions:', availableFunctions.slice(0, 30));
      console.error('🎯 Assignment functions in ABI:', Array.from(abiFunctionMap.keys()));

      throw new Error(`No assignment function found in deployed facets. Checked functions: ${Array.from(abiFunctionMap.keys()).join(', ')}. This suggests the required facet is not deployed or the function selectors don't match.`);
    }

    const tx = assignmentResult;

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 0) {
      throw new Error('Transaction reverted - check contract logic and requirements');
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Delivery agent assigned successfully.'
    });
  } catch (error) {
    console.error('Assign delivery agent error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to assign delivery agent: ${error.message}`
    }, { status: 500 });
  }
}

async function handleAssignDeliveryAgentToOrder(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { orderId, deliveryAgentAddress } = body;

    if (!orderId || !deliveryAgentAddress) {
      throw new Error('Order ID and delivery agent address are required');
    }

    console.log(`🚚 Assigning delivery agent ${deliveryAgentAddress} to order #${orderId}`);

    // Skip pre-flight checks since many functions are not deployed
    console.log('⚠️ Skipping pre-flight checks - proceeding with order assignment');

    // Use the correct DeliveryFacet function: assignDeliveryAgent(orderId, agent)
    const functionName = 'assignDeliveryAgent';
    const selector = '0x376efecc'; // From our discovery

    console.log(`🎯 Using ${functionName} with selector ${selector}`);

    let assignmentResult = null;

    // Method 1: Try direct contract call (if function is available)
    try {
      if (diamondContract[functionName]) {
        console.log(`🚀 Attempting direct call to ${functionName}...`);

        // Test with callStatic first
        await diamondContract.callStatic[functionName](orderId, deliveryAgentAddress);
        console.log(`✅ callStatic test passed for ${functionName}`);

        // Execute the transaction
        const tx = await diamondContract[functionName](
          orderId,
          deliveryAgentAddress,
          {
            gasLimit: 500000
          }
        );

        assignmentResult = tx;
        console.log(`✅ Successfully called ${functionName}, tx: ${tx.hash}`);
      } else {
        console.log(`⚠️ Function ${functionName} not available on contract object`);
      }
    } catch (directError) {
      console.log(`❌ Direct call failed:`, directError.message);
    }

    // Method 2: Raw transaction with function selector
    if (!assignmentResult) {
      try {
        console.log(`🔧 Attempting raw transaction with selector ${selector}...`);

        // Encode the function call data
        const iface = new ethers.Interface([
          "function assignDeliveryAgent(uint256 orderId, address agent) returns (uint256)"
        ]);

        const calldata = iface.encodeFunctionData("assignDeliveryAgent", [orderId, deliveryAgentAddress]);
        console.log(`📄 Generated calldata: ${calldata}`);

        // Send raw transaction to Diamond proxy
        const rawTx = await adminWallet.sendTransaction({
          to: diamondContract.target,
          data: calldata,
          gasLimit: 500000
        });

        assignmentResult = rawTx;
        console.log(`✅ Raw transaction successful, tx: ${rawTx.hash}`);

      } catch (rawError) {
        console.log(`❌ Raw transaction failed:`, rawError.message);
      }
    }

    // Method 3: Direct facet call
    if (!assignmentResult) {
      try {
        console.log(`🎯 Attempting direct facet call to DeliveryFacet...`);

        // Get the DeliveryFacet address from our ABI mapping
        const deliveryFacetAddress = "0xF12df5aa71f6b6F746CC48d4B2Dbe0D173D67994"; // From the ABI

        // Create contract instance for DeliveryFacet
        const deliveryFacetContract = new ethers.Contract(
          deliveryFacetAddress,
          [
            {
              "type": "function",
              "name": "assignDeliveryAgent",
              "inputs": [
                { "name": "orderId", "type": "uint256" },
                { "name": "agent", "type": "address" }
              ],
              "outputs": [{ "name": "", "type": "uint256" }],
              "stateMutability": "nonpayable"
            }
          ],
          adminWallet
        );

        // Test with callStatic first
        await deliveryFacetContract.callStatic.assignDeliveryAgent(orderId, deliveryAgentAddress);
        console.log(`✅ Direct facet callStatic passed`);

        // Execute the transaction
        const tx = await deliveryFacetContract.assignDeliveryAgent(
          orderId,
          deliveryAgentAddress,
          {
            gasLimit: 500000
          }
        );

        assignmentResult = tx;
        console.log(`✅ Direct facet call successful, tx: ${tx.hash}`);

      } catch (facetError) {
        console.log(`❌ Direct facet call failed:`, facetError.message);
      }
    }

    if (!assignmentResult) {
      throw new Error(`Failed to assign delivery agent to order. All methods failed. Please ensure the order exists and the delivery agent is registered.`);
    }

    const tx = assignmentResult;
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 0) {
      throw new Error('Transaction reverted - check order status and delivery agent eligibility');
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Delivery agent successfully assigned to order #${orderId}.`
    });
  } catch (error) {
    console.error('Assign delivery agent to order error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to assign delivery agent to order: ${error.message}`
    }, { status: 500 });
  }
}

async function handleRemoveDeliveryAgent(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { shopkeeperAddress } = body;

    if (!shopkeeperAddress) {
      throw new Error('Shopkeeper address is required');
    }

    console.log(`🚀 Removing delivery agent from shopkeeper ${shopkeeperAddress}`);

    const tx = await diamondContract.connect(adminWallet).removeDeliveryAgentFromShopkeeper(
      shopkeeperAddress,
      {
        gasLimit: 500000
      }
    );

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Delivery agent removed successfully.'
    });
  } catch (error) {
    console.error('Remove delivery agent error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to remove delivery agent: ${error.message}`
    }, { status: 500 });
  }
}

async function handleTransferConsumer(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar, newShopkeeperAddress } = body;

    if (!aadhaar || !newShopkeeperAddress) {
      throw new Error('Aadhaar and new shopkeeper address are required');
    }

    console.log(`🚀 Transferring consumer ${aadhaar} to shopkeeper ${newShopkeeperAddress}`);

    const tx = await diamondContract.connect(adminWallet).transferConsumerToShopkeeper(
      aadhaar,
      newShopkeeperAddress,
      {
        gasLimit: 500000
      }
    );

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Consumer transferred successfully.'
    });
  } catch (error) {
    console.error('Transfer consumer error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to transfer consumer: ${error.message}`
    }, { status: 500 });
  }
}

async function handleUpdateConsumerCategory(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar, newCategory } = body;

    if (!aadhaar || !newCategory) {
      throw new Error('Aadhaar and new category are required');
    }

    console.log(`🚀 Updating consumer ${aadhaar} category to ${newCategory}`);

    const tx = await diamondContract.connect(adminWallet).updateConsumerCategory(
      aadhaar,
      newCategory,
      {
        gasLimit: 500000
      }
    );

    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Consumer category updated successfully.'
    });
  } catch (error) {
    console.error('Update consumer category error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to update consumer category: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSystemStatus() {
  try {
    console.log('🔍 Performing comprehensive system status check...');

    const status = {
      contract: {
        address: CONTRACT_ADDRESS,
        network: 'Polygon Amoy Testnet',
        connected: !!dashboardContract
      },
      functions: {
        available: [],
        unavailable: [],
        testResults: {}
      },
      data: {
        dashboard: null,
        actualCounts: {}
      }
    };

    if (!dashboardContract) {
      throw new Error('Contract not initialized');
    }

    // Test major functions
    const functionsToTest = [
      'getAdminDashboard',
      'getTotalConsumers',
      'getAllShopkeepers',
      'getDeliveryAgents',
      'getConsumersPaginated'
    ];

    for (const funcName of functionsToTest) {
      try {
        console.log(`Testing ${funcName}...`);
        let result;

        switch (funcName) {
          case 'getAdminDashboard':
            result = await dashboardContract.getAdminDashboard();
            status.data.dashboard = {
              totalConsumers: Number(result.totalConsumers),
              totalShopkeepers: Number(result.totalShopkeepers),
              totalDeliveryAgents: Number(result.totalDeliveryAgents)
            };
            break;
          case 'getTotalConsumers':
            result = await dashboardContract.getTotalConsumers();
            status.data.actualCounts.consumers = Number(result);
            break;
          case 'getAllShopkeepers':
            result = await dashboardContract.getAllShopkeepers();
            status.data.actualCounts.shopkeepers = result ? result.length : 0;
            break;
          case 'getDeliveryAgents':
            result = await dashboardContract.getDeliveryAgents();
            status.data.actualCounts.deliveryAgents = result ? result.length : 0;
            break;
          case 'getConsumersPaginated':
            result = await dashboardContract.getConsumersPaginated(0, 10);
            status.data.actualCounts.consumersFromPagination = result.consumerList ? result.consumerList.length : 0;
            break;
        }

        status.functions.available.push(funcName);
        status.functions.testResults[funcName] = 'SUCCESS';
        console.log(`✅ ${funcName} - SUCCESS`);
      } catch (error) {
        status.functions.unavailable.push(funcName);
        status.functions.testResults[funcName] = `ERROR: ${error.message}`;
        console.log(`❌ ${funcName} - ERROR: ${error.message}`);
      }
    }

    // Data integrity analysis
    const dashboard = status.data.dashboard;
    const actual = status.data.actualCounts;

    status.analysis = {
      dataIntegrityIssues: [],
      recommendations: []
    };

    if (dashboard && actual.consumers !== undefined && dashboard.totalConsumers !== actual.consumers) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Consumer count mismatch',
        dashboardValue: dashboard.totalConsumers,
        actualValue: actual.consumers,
        severity: 'HIGH'
      });
    }

    if (dashboard && actual.shopkeepers !== undefined && dashboard.totalShopkeepers !== actual.shopkeepers) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Shopkeeper count mismatch',
        dashboardValue: dashboard.totalShopkeepers,
        actualValue: actual.shopkeepers,
        severity: 'HIGH'
      });
    }

    if (dashboard && actual.deliveryAgents !== undefined && dashboard.totalDeliveryAgents !== actual.deliveryAgents) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Delivery agent count mismatch',
        dashboardValue: dashboard.totalDeliveryAgents,
        actualValue: actual.deliveryAgents,
        severity: 'HIGH'
      });
    }

    // Generate recommendations
    if (status.analysis.dataIntegrityIssues.length > 0) {
      status.analysis.recommendations.push('The contract appears to have test/hardcoded data that doesn\'t match actual registrations');
      status.analysis.recommendations.push('Consider using actual registration counts instead of dashboard totals');
      status.analysis.recommendations.push('This is common in development contracts with pre-seeded data');
    }

    if (status.functions.unavailable.length > 0) {
      status.analysis.recommendations.push('Some Diamond facets may not be properly cut/registered');
      status.analysis.recommendations.push('Check Diamond contract deployment and facet registration');
    }

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function handleSyncConsumer(body) {
  try {
    const { aadhaar } = body;

    if (!aadhaar) {
      throw new Error('Aadhaar number is required');
    }

    console.log(`🔄 Syncing consumer with Aadhaar: ${aadhaar}`);

    // First check if consumer exists on blockchain using different methods
    let blockchainConsumer = null;
    const aadhaarBN = BigInt(aadhaar);

    try {
      // Try multiple contract instances and methods
      if (diamondContract) {
        console.log('🔍 Trying diamondContract.getConsumerByAadhaar...');
        try {
          blockchainConsumer = await diamondContract.getConsumerByAadhaar(aadhaarBN);
          console.log('✅ Found consumer via diamondContract:', blockchainConsumer);
        } catch (diamondError) {
          console.log('⚠️ diamondContract failed:', diamondError.message);
        }
      }

      if (!blockchainConsumer && dashboardContract) {
        console.log('🔍 Trying dashboardContract.getConsumerByAadhaar...');
        try {
          blockchainConsumer = await dashboardContract.getConsumerByAadhaar(aadhaarBN);
          console.log('✅ Found consumer via dashboardContract:', blockchainConsumer);
        } catch (dashboardError) {
          console.log('⚠️ dashboardContract failed:', dashboardError.message);
        }
      }

      // Check if we got valid consumer data
      if (!blockchainConsumer || !blockchainConsumer.name || blockchainConsumer.aadhaar === BigInt(0)) {
        // Instead of throwing error, let's create from mockdata if available
        console.log('🔍 Consumer not found on blockchain, checking mockdata...');

        // Try to find consumer in mockdata
        const mockConsumer = await findConsumerInMockdata(aadhaar);
        if (mockConsumer) {
          console.log('✅ Found consumer in mockdata:', mockConsumer.name);
          blockchainConsumer = {
            name: mockConsumer.name,
            mobile: mockConsumer.phoneNumber,
            category: mockConsumer.category,
            aadhaar: aadhaarBN
          };
        } else {
          throw new Error('Consumer not found on blockchain or in mockdata');
        }
      }

    } catch (blockchainError) {
      console.error('❌ All blockchain lookup methods failed:', blockchainError);

      // Final fallback: try to find in mockdata
      console.log('🔍 Final fallback: checking mockdata...');
      const mockConsumer = await findConsumerInMockdata(aadhaar);
      if (mockConsumer) {
        console.log('✅ Using mockdata for consumer sync');
        blockchainConsumer = {
          name: mockConsumer.name,
          mobile: mockConsumer.phoneNumber,
          category: mockConsumer.category,
          aadhaar: aadhaarBN
        };
      } else {
        throw new Error(`No consumer data found anywhere for Aadhaar ${aadhaar}`);
      }
    }

    // Check if consumer exists in database
    await dbConnect();
    const existingConsumer = await ConsumerSignupRequest.findOne({
      aadharNumber: aadhaar
    });

    if (existingConsumer) {
      console.log('✅ Consumer already exists in database');
      return NextResponse.json({
        success: true,
        message: 'Consumer already synced',
        consumer: {
          id: existingConsumer._id,
          name: existingConsumer.name,
          aadhaar: existingConsumer.aadharNumber,
          status: existingConsumer.status
        }
      });
    }

    // Create consumer in database from blockchain/mockdata
    const bcrypt = require('bcryptjs');
    const defaultPin = '123456'; // Default PIN for synced consumers
    const hashedPin = await bcrypt.hash(defaultPin, 10);

    // Extract consumer data
    const consumerData = {
      name: blockchainConsumer.name,
      phone: blockchainConsumer.mobile || '0000000000',
      homeAddress: 'Village (Synced)',
      rationCardId: `RC${aadhaar}`,
      aadharNumber: aadhaar,
      pin: hashedPin,
      status: 'approved',
      approvedAt: new Date(),
      blockchainTxHash: 'sync-from-data',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newConsumer = new ConsumerSignupRequest(consumerData);
    await newConsumer.save();

    console.log('✅ Consumer synced successfully to database');

    return NextResponse.json({
      success: true,
      message: 'Consumer synced successfully',
      consumer: {
        id: newConsumer._id,
        name: newConsumer.name,
        aadhaar: newConsumer.aadharNumber,
        status: newConsumer.status,
        defaultPin: defaultPin
      },
      instructions: `Consumer can now login with Aadhaar ${aadhaar} and PIN ${defaultPin}`
    });

  } catch (error) {
    console.error('Sync consumer error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to sync consumer: ${error.message}`
    }, { status: 500 });
  }
}

// Helper function to find consumer in mockdata
async function findConsumerInMockdata(aadhaar) {
  try {
    const fs = require('fs');
    const path = require('path');

    // Read mockdata.json
    const mockdataPath = path.join(process.cwd(), 'public', 'mockdata.json');

    if (!fs.existsSync(mockdataPath)) {
      console.log('Mockdata file not found');
      return null;
    }

    const mockdata = JSON.parse(fs.readFileSync(mockdataPath, 'utf8'));
    const consumer = mockdata.find(c => c.aadhaar === aadhaar);

    return consumer || null;
  } catch (error) {
    console.error('Error reading mockdata:', error);
    return null;
  }
}

async function handleManualSyncConsumer(body) {
  try {
    const { aadhaar, name, phone, category, village } = body;

    if (!aadhaar) {
      throw new Error('Aadhaar number is required');
    }

    console.log(`🔄 Manual sync for consumer: ${aadhaar}`);

    // Check if consumer exists in database
    await dbConnect();
    const existingConsumer = await ConsumerSignupRequest.findOne({
      aadharNumber: aadhaar
    });

    if (existingConsumer) {
      console.log('✅ Consumer already exists in database');
      return NextResponse.json({
        success: true,
        message: 'Consumer already exists in database',
        consumer: {
          id: existingConsumer._id,
          name: existingConsumer.name,
          aadhaar: existingConsumer.aadharNumber,
          status: existingConsumer.status
        }
      });
    }

    // Create consumer in database with provided or default data
    const bcrypt = require('bcryptjs');
    const defaultPin = '123456';
    const hashedPin = await bcrypt.hash(defaultPin, 10);

    const consumerData = {
      name: name || 'Consumer',
      phone: phone || '0000000000',
      homeAddress: village || 'Village',
      rationCardId: `RC${aadhaar}`,
      aadharNumber: aadhaar,
      pin: hashedPin,
      status: 'approved',
      approvedAt: new Date(),
      blockchainTxHash: 'manual-entry',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newConsumer = new ConsumerSignupRequest(consumerData);
    await newConsumer.save();

    console.log('✅ Consumer manually synced to database');

    return NextResponse.json({
      success: true,
      message: 'Consumer manually added to database',
      consumer: {
        id: newConsumer._id,
        name: newConsumer.name,
        aadhaar: newConsumer.aadharNumber,
        status: newConsumer.status,
        defaultPin: defaultPin
      },
      instructions: `Consumer can now login with Aadhaar ${aadhaar} and PIN ${defaultPin}`
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to manually sync consumer: ${error.message}`
    }, { status: 500 });
  }
}

// ===================================
// Indian PDS Order Management System
// ===================================

async function handleCreateOrder(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const {
      aadhaar,
      tokenIds,
      shopkeeperAddress,
      deliveryAddress,
      specialInstructions = '',
      isEmergency = false
    } = body;

    if (!aadhaar || !tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      throw new Error('Consumer Aadhaar and token IDs are required');
    }

    if (!shopkeeperAddress) {
      throw new Error('Shopkeeper address is required');
    }

    if (!deliveryAddress) {
      throw new Error('Delivery address is required');
    }

    console.log(`🛒 Creating PDS order for Aadhaar: ${aadhaar}`);
    console.log(`📦 Token IDs: ${tokenIds.join(', ')}`);
    console.log(`🏪 Shopkeeper: ${shopkeeperAddress}`);
    console.log(`📍 Delivery: ${deliveryAddress}`);
    console.log(`⚠️ Emergency: ${isEmergency}`);

    // Multiple fallback methods for order creation
    let orderResult = null;
    let successfulMethod = null;

    // Method 1: Direct contract call
    try {
      console.log('🎯 Attempting direct createOrder call...');
      if (diamondContract.createOrder) {
        const tx = await diamondContract.createOrder(
          aadhaar,
          tokenIds,
          shopkeeperAddress,
          deliveryAddress,
          specialInstructions,
          isEmergency
        );
        orderResult = tx;
        successfulMethod = 'Direct contract call';
        console.log(`✅ Order created via direct call, tx: ${tx.hash}`);
      } else {
        console.log('❌ createOrder function not available on contract interface');
      }
    } catch (directError) {
      console.log(`❌ Direct call failed: ${directError.message}`);
    }

    // Method 2: Raw transaction with function selector
    if (!orderResult) {
      try {
        console.log('🎯 Attempting raw createOrder transaction...');

        // createOrder function selector: createOrder(uint256,uint256[],address,string,string,bool)
        const createOrderSelector = '0x7e7e7e7e'; // You'll need to calculate this
        const abiCoder = new ethers.AbiCoder();

        const functionData = createOrderSelector + abiCoder.encode(
          ['uint256', 'uint256[]', 'address', 'string', 'string', 'bool'],
          [aadhaar, tokenIds, shopkeeperAddress, deliveryAddress, specialInstructions, isEmergency]
        ).slice(2);

        const tx = await adminWallet.sendTransaction({
          to: diamondContract.address,
          data: functionData,
          gasLimit: 800000
        });

        orderResult = tx;
        successfulMethod = 'Raw transaction';
        console.log(`✅ Order created via raw transaction, tx: ${tx.hash}`);
      } catch (rawError) {
        console.log(`❌ Raw transaction failed: ${rawError.message}`);
      }
    }

    if (!orderResult) {
      throw new Error('All order creation methods failed. The createOrder function may not be deployed or accessible.');
    }

    const receipt = await orderResult.wait();
    console.log('Order creation confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 0) {
      throw new Error('Order creation transaction reverted');
    }

    // Extract order ID from logs if available
    let orderId = null;
    try {
      // Look for OrderCreated event
      const orderCreatedTopic = ethers.id("OrderCreated(uint256,uint256,address,address,string,bool)");
      const orderLog = receipt.logs.find(log => log.topics[0] === orderCreatedTopic);
      if (orderLog) {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], orderLog.topics[1]);
        orderId = decoded[0].toString();
        console.log(`📋 Order ID: ${orderId}`);
      }
    } catch (logError) {
      console.log('⚠️ Could not extract order ID from logs:', logError.message);
    }

    return NextResponse.json({
      success: true,
      txHash: orderResult.hash,
      orderId,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${orderResult.hash}`,
      message: `PDS order created successfully${orderId ? ` with ID: ${orderId}` : ''}`,
      method: successfulMethod,
      orderDetails: {
        aadhaar,
        tokenIds,
        shopkeeper: shopkeeperAddress,
        deliveryAddress,
        specialInstructions,
        isEmergency
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to create order: ${error.message}`
    }, { status: 500 });
  }
}

async function handleGetOrders(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { shopkeeperAddress, aadhaar, limit = 50, offset = 0 } = body;

    console.log('📋 Fetching PDS orders...');

    // Try different methods to get orders
    let orders = [];
    let successfulMethod = null;

    // Method 1: Get orders by shopkeeper
    if (shopkeeperAddress && diamondContract.getShopkeeperOrders) {
      try {
        console.log(`🏪 Fetching orders for shopkeeper: ${shopkeeperAddress}`);
        const shopkeeperOrders = await diamondContract.getShopkeeperOrders(shopkeeperAddress);
        orders = shopkeeperOrders;
        successfulMethod = 'Shopkeeper orders';
      } catch (error) {
        console.log(`❌ Failed to get shopkeeper orders: ${error.message}`);
      }
    }

    // Method 2: Get orders by consumer Aadhaar
    if (aadhaar && diamondContract.getConsumerOrders) {
      try {
        console.log(`👤 Fetching orders for consumer: ${aadhaar}`);
        const consumerOrders = await diamondContract.getConsumerOrders(aadhaar);
        orders = consumerOrders;
        successfulMethod = 'Consumer orders';
      } catch (error) {
        console.log(`❌ Failed to get consumer orders: ${error.message}`);
      }
    }

    // Method 3: Get all orders (if available)
    if (orders.length === 0 && diamondContract.getAllOrders) {
      try {
        console.log('📋 Fetching all orders...');
        const allOrders = await diamondContract.getAllOrders();
        orders = allOrders;
        successfulMethod = 'All orders';
      } catch (error) {
        console.log(`❌ Failed to get all orders: ${error.message}`);
      }
    }

    // Format orders for display
    const formattedOrders = orders.slice(offset, offset + limit).map((order, index) => {
      if (Array.isArray(order)) {
        // If order is returned as array tuple
        return {
          orderId: order[0]?.toString(),
          aadhaar: order[1]?.toString(),
          shopkeeper: order[2],
          deliveryAgent: order[3],
          status: order[4]?.toString(),
          createdAt: order[5] ? new Date(Number(order[5]) * 1000).toISOString() : null,
          deliveryAddress: order[6],
          isEmergency: order[7],
          tokenIds: order[8] || []
        };
      } else if (typeof order === 'object') {
        // If order is returned as struct
        return {
          orderId: order.orderId?.toString(),
          aadhaar: order.aadhaar?.toString(),
          shopkeeper: order.shopkeeper,
          deliveryAgent: order.deliveryAgent,
          status: order.status?.toString(),
          createdAt: order.timestamp ? new Date(Number(order.timestamp) * 1000).toISOString() : null,
          deliveryAddress: order.deliveryAddress,
          isEmergency: order.isEmergency,
          tokenIds: order.tokenIds || []
        };
      }
      return order;
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      total: orders.length,
      method: successfulMethod,
      pagination: {
        limit,
        offset,
        hasMore: orders.length > offset + limit
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to get orders: ${error.message}`
    }, { status: 500 });
  }
}

// New pickup management functions
async function handlePickupStatistics() {
  try {
    console.log('📊 Fetching pickup statistics from blockchain...');

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    const stats = await contract.getPickupStatistics();

    return NextResponse.json({
      success: true,
      data: {
        totalPickups: Number(stats.totalPickups),
        pendingPickups: Number(stats.pendingPickups),
        completedPickups: Number(stats.completedPickups),
        activeAgents: Number(stats.activeAgents),
        activeShopkeepers: Number(stats.activeShopkeepers)
      }
    });
  } catch (error) {
    console.error('Pickup statistics fetch error:', error);
    return NextResponse.json({
      success: true,
      data: {
        totalPickups: 0,
        pendingPickups: 0,
        completedPickups: 0,
        activeAgents: 0,
        activeShopkeepers: 0
      },
      warning: 'Using fallback pickup statistics - blockchain connection issue'
    });
  }
}

async function handleAllPickups() {
  try {
    console.log('📦 Fetching all pickups from blockchain...');

    // For now, return mock data since we need to implement a function to get all pickups
    // In a real implementation, you'd call a contract function like getAllPickups()

    return NextResponse.json({
      success: true,
      data: [
        // Mock pickup data - replace with actual blockchain call
        {
          pickupId: 1,
          deliveryAgent: "0x1234567890123456789012345678901234567890",
          deliveryAgentName: "John Doe",
          shopkeeper: "0x0987654321098765432109876543210987654321",
          shopkeeperName: "Shop ABC",
          rationAmount: 50,
          category: "BPL",
          status: 0,
          assignedTime: Math.floor(Date.now() / 1000) - 3600,
          pickupLocation: "Warehouse A",
          deliveryInstructions: "Handle with care"
        }
      ]
    });
  } catch (error) {
    console.error('All pickups fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No pickups available - blockchain connection issue'
    });
  }
}