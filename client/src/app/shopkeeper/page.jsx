"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { useTranslation } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import OTPService from "@/lib/services/otpService";
import {
  RefreshCw,
  Users,
  Package,
  CreditCard,
  Truck,
  TrendingUp,
  Check,
  CheckCircle,
  X,
  AlertTriangle,
  Calendar,
  Phone,
  MapPin,
  DollarSign
} from "lucide-react";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";

// Contract configuration - Using the correct contract address from your admin API
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";

// ABI import helper - Merge all contract ABIs
function getMergedABI() {
  try {
    console.log("📄 DiamondMergedABI structure:", Object.keys(DiamondMergedABI));

    let mergedABI = [];

    // Method 1: Check if we have the abiMap structure (new format)
    if (DiamondMergedABI.abiMap && typeof DiamondMergedABI.abiMap === 'object') {
      console.log("📄 Found abiMap structure, merging all ABIs...");
      console.log("📄 Available contracts in abiMap:", Object.keys(DiamondMergedABI.abiMap));

      // Merge ABIs from all contracts in abiMap
      Object.keys(DiamondMergedABI.abiMap).forEach(contractName => {
        const abi = DiamondMergedABI.abiMap[contractName];
        if (Array.isArray(abi)) {
          console.log(`📄 Adding ${abi.length} functions from ${contractName}`);
          mergedABI.push(...abi);
        }
      });
    }
    // Method 2: Check if we have the contracts structure (old format)
    else if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
      console.log("📄 Found contracts structure, merging all ABIs...");
      console.log("📄 Available contracts:", Object.keys(DiamondMergedABI.contracts));

      // Merge ABIs from all contracts
      Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
        const contractData = DiamondMergedABI.contracts[contractName];
        if (contractData.abi && Array.isArray(contractData.abi)) {
          console.log(`📄 Adding ${contractData.abi.length} functions from ${contractName}`);
          mergedABI.push(...contractData.abi);
        }
      });
    }
    // Method 3: Direct ABI array
    else if (DiamondMergedABI.abi && Array.isArray(DiamondMergedABI.abi)) {
      console.log("📄 Using DiamondMergedABI.abi as direct array");
      mergedABI = DiamondMergedABI.abi;
    }
    // Method 4: DiamondMergedABI is itself an array
    else if (Array.isArray(DiamondMergedABI)) {
      console.log("📄 Using DiamondMergedABI as array fallback");
      mergedABI = DiamondMergedABI;
    }

    if (mergedABI.length > 0) {
      console.log(`📄 Total merged ABI functions: ${mergedABI.length}`);

      // Check for specific functions we need
      const hasShopkeeperDashboard = mergedABI.some(item =>
        item.type === 'function' && item.name === 'getShopkeeperDashboard'
      );
      const hasMyShopPickups = mergedABI.some(item =>
        item.type === 'function' && item.name === 'getMyShopPickups'
      );
      const hasConfirmReceipt = mergedABI.some(item =>
        item.type === 'function' && item.name === 'confirmRationReceipt'
      );

      console.log("📄 Function availability check:");
      console.log("  - getShopkeeperDashboard:", hasShopkeeperDashboard);
      console.log("  - getMyShopPickups:", hasMyShopPickups);
      console.log("  - confirmRationReceipt:", hasConfirmReceipt);

      return mergedABI;
    }

    throw new Error("Could not find any valid ABI structure in DiamondMergedABI");
  } catch (error) {
    console.error('❌ Error loading merged ABI:', error);
    return [];
  }
}

// RPC Provider helper
function getWorkingProvider() {
  const providers = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com'
  ];

  // Try each provider in sequence
  for (const rpcUrl of providers) {
    try {
      return new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.warn(`Provider ${rpcUrl} failed:`, error);
    }
  }

  throw new Error('All RPC providers failed');
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ShopkeeperDashboard() {
  const { connected, account, provider } = useMetaMask();
  const router = useRouter();

  // Core states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [shopkeeperInfo, setShopkeeperInfo] = useState(null);
  const [assignedConsumers, setAssignedConsumers] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [payments, setPayments] = useState(null);
  const [deliveries, setDeliveries] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [contract, setContract] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConsumerTokens, setSelectedConsumerTokens] = useState(null);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Initialize contract and fetch data
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log("🚀 Initializing shopkeeper dashboard...");
      console.log("Connected:", connected, "Account:", account);

      if (!connected || !account) {
        console.log("⚠️ Wallet not connected, showing error");
        setError("Please connect your wallet to access the shopkeeper dashboard");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        console.log("🔗 Creating contract connection...");
        console.log("Contract Address:", CONTRACT_ADDRESS);

        // Get working provider and create contract instance
        const workingProvider = getWorkingProvider();
        let signer = null;

        // Handle MetaMask provider properly
        if (provider && connected) {
          try {
            // Create ethers provider from MetaMask provider
            const ethersProvider = new ethers.BrowserProvider(provider);
            signer = await ethersProvider.getSigner();
            console.log("✅ MetaMask signer created");
          } catch (signerError) {
            console.warn("⚠️ Could not get signer from MetaMask:", signerError);
            signer = null;
          }
        }

        const mergedABI = getMergedABI();
        console.log("📄 ABI loaded, type:", typeof mergedABI);
        console.log("📄 ABI is array:", Array.isArray(mergedABI));
        console.log("📄 ABI length:", mergedABI?.length || 0);

        if (!Array.isArray(mergedABI) || mergedABI.length === 0) {
          throw new Error("Invalid ABI: Expected non-empty array, got " + typeof mergedABI);
        }

        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          mergedABI,
          signer || workingProvider
        );

        console.log("✅ Contract instance created");
        setContract(contractInstance);

        // Test contract connection by checking if the address is a valid shopkeeper
        try {
          console.log("🧪 Testing contract connection...");
          await contractInstance.getShopkeeperDashboard(account);
          console.log("✅ Contract connection successful");
        } catch (testError) {
          console.log("⚠️ Contract test failed:", testError.message);
          if (testError.message.includes("Invalid shopkeeper") ||
            testError.message.includes("missing revert data") ||
            testError.code === "CALL_EXCEPTION") {
            console.log("🔧 Attempting to register shopkeeper automatically...");

            // Try to auto-register the shopkeeper
            try {
              const registerResponse = await fetch('/api/admin?endpoint=register-shopkeeper', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  address: account,
                  name: `Shopkeeper ${account.slice(-4).toUpperCase()}`,
                  area: "Auto-Registered Area"
                })
              });

              const registerResult = await registerResponse.json();
              if (registerResult.success || registerResult.alreadyRegistered) {
                console.log("✅ Shopkeeper auto-registration successful");
                // Continue with dashboard initialization
              } else {
                throw new Error(registerResult.error || "Auto-registration failed");
              }
            } catch (regError) {
              console.error("❌ Auto-registration failed:", regError);
              setError(`Your wallet address (${account}) is not registered as a shopkeeper. Please contact the admin to register your address.`);
              setLoading(false);
              return;
            }
          } else {
            // Other contract errors
            console.error("❌ Contract connection error:", testError);
            setError(`Contract connection failed: ${testError.message}`);
            setLoading(false);
            return;
          }
        }

        // Fetch all dashboard data
        await fetchDashboardData(contractInstance, account);

        setLoading(false);
        console.log("🎉 Dashboard initialization complete");
      } catch (err) {
        console.error("❌ Error initializing dashboard:", err);
        setError(`Failed to initialize dashboard: ${err.message}`);
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [connected, account, provider]);

  // Fetch dashboard data from blockchain
  const fetchDashboardData = async (contractInstance, shopkeeperAddress) => {
    try {
      console.log("🏪 Fetching dashboard for shopkeeper:", shopkeeperAddress);

      // Fetch shopkeeper dashboard data - returns tuple with specific structure
      let dashboardResult;
      try {
        dashboardResult = await contractInstance.getShopkeeperDashboard(shopkeeperAddress);
        console.log('📊 Raw Dashboard Result:', dashboardResult);
      } catch (dashboardError) {
        console.error('❌ getShopkeeperDashboard failed:', dashboardError);

        // If the function fails, create default dashboard data
        console.log('🔧 Creating default dashboard data...');
        dashboardResult = [
          shopkeeperAddress, // shopkeeperAddress
          0, // assignedConsumers
          0, // activeConsumers
          0, // monthlyTokensIssued
          0, // totalTokensIssued
          0, // totalDeliveries
          true, // isActive
          Math.floor(Date.now() / 1000) // registrationTime
        ];
      }

      // Parse the returned tuple according to your contract function
      const dashboardData = {
        shopkeeperAddress: dashboardResult[0],
        assignedConsumers: Number(dashboardResult[1]),
        activeConsumers: Number(dashboardResult[2]),
        monthlyTokensIssued: Number(dashboardResult[3]),
        totalTokensIssued: Number(dashboardResult[4]),
        totalDeliveries: Number(dashboardResult[5]),
        isActive: dashboardResult[6],
        registrationTime: Number(dashboardResult[7])
      };

      console.log('✅ Parsed Dashboard Data:', dashboardData);
      setDashboardData(dashboardData);

      // Get shopkeeper information
      try {
        const shopkeeperData = await contractInstance.getShopkeeperInfo(shopkeeperAddress);
        console.log('👨‍💼 Raw Shopkeeper Data:', shopkeeperData);

        const shopkeeperInfo = {
          shopkeeperAddress: shopkeeperData[0],
          name: shopkeeperData[1] || "Shopkeeper",
          area: shopkeeperData[2] || "Area Not Set",
          registrationTime: Number(shopkeeperData[3]) || 0,
          totalConsumersAssigned: Number(shopkeeperData[4]) || 0,
          totalTokensIssued: Number(shopkeeperData[5]) || 0,
          totalDeliveries: Number(shopkeeperData[6]) || 0,
          isActive: Boolean(shopkeeperData[7]) || false
        };
        setShopkeeperInfo(shopkeeperInfo);
        console.log('👨‍💼 Parsed Shopkeeper Info:', shopkeeperInfo);
      } catch (err) {
        // Use wallet address as fallback if no shopkeeper details available
        console.log('⚠️ Shopkeeper details not available, using wallet address');
        setShopkeeperInfo({
          shopkeeperAddress: account,
          name: "Shopkeeper " + account.slice(-4).toUpperCase(),
          area: "Area Not Set",
          registrationTime: 0,
          totalConsumersAssigned: 0,
          totalTokensIssued: 0,
          totalDeliveries: 0,
          isActive: true
        });
      }

      // Fetch assigned consumers list
      try {
        const consumers = await contractInstance.getConsumersByShopkeeper(shopkeeperAddress);
        console.log('👥 Assigned Consumers:', consumers);
        setAssignedConsumers(consumers || []);
      } catch (err) {
        console.log('⚠️ Consumers function not available:', err);
        setAssignedConsumers([]);
      }

      // Fetch unclaimed tokens for this shopkeeper
      try {
        // Try to get unclaimed tokens by shopkeeper (if function exists)
        let unclaimedTokens = [];
        
        try {
          unclaimedTokens = await contractInstance.getUnclaimedTokensByShopkeeper(shopkeeperAddress);
          console.log('🎫 Unclaimed Tokens from Diamond contract:', unclaimedTokens);
        } catch (diamondErr) {
          console.log('⚠️ Diamond contract unclaimed tokens function not available:', diamondErr.message);
          
          // Fallback: Get tokens from assigned consumers
          try {
            console.log('🔄 Trying fallback: getting tokens from assigned consumers...');
            const assignedConsumers = await contractInstance.getConsumersByShopkeeper(shopkeeperAddress);
            console.log('👥 Assigned consumers:', assignedConsumers);
            
            // For each consumer, check if they have unclaimed tokens
            for (const consumer of assignedConsumers) {
              try {
                const consumerAadhaar = consumer.aadhaar || consumer[0];
                console.log(`🔍 Checking tokens for consumer: ${consumerAadhaar}`);
                
                // Use our new API endpoint to get unclaimed tokens
                const response = await fetch('/api/admin?endpoint=get-unclaimed-tokens', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    aadhaar: consumerAadhaar.toString(),
                    includeClaimedTokens: false 
                  })
                });
                
                if (response.ok) {
                  const tokenData = await response.json();
                  if (tokenData.success && tokenData.tokens.length > 0) {
                    unclaimedTokens.push(...tokenData.tokens);
                  }
                }
              } catch (consumerErr) {
                console.warn(`Failed to get tokens for consumer:`, consumerErr);
              }
            }
            
            console.log('🎫 Total unclaimed tokens found via fallback:', unclaimedTokens.length);
          } catch (fallbackErr) {
            console.warn('⚠️ Fallback approach also failed:', fallbackErr.message);
          }
        }
        
        setInventory({ unclaimedTokens: unclaimedTokens || [] });
      } catch (err) {
        console.log('⚠️ All unclaimed tokens approaches failed:', err);
        setInventory({ unclaimedTokens: [] });
      }

      // Set basic metrics for payments and deliveries from dashboard data
      setPayments({
        totalPayments: dashboardData.totalTokensIssued,
        monthlyPayments: dashboardData.monthlyTokensIssued
      });

      setDeliveries({
        totalDeliveries: dashboardData.totalDeliveries,
        pendingDeliveries: dashboardData.assignedConsumers - dashboardData.totalDeliveries
      });

      setAnalytics({
        deliveryRate: dashboardData.totalTokensIssued > 0 ?
          ((dashboardData.totalDeliveries / dashboardData.totalTokensIssued) * 100).toFixed(1) : '0',
        activeRate: dashboardData.assignedConsumers > 0 ?
          ((dashboardData.activeConsumers / dashboardData.assignedConsumers) * 100).toFixed(1) : '0',
        monthlyTokens: dashboardData.monthlyTokensIssued || 0,
        pendingDeliveries: Math.max(0, dashboardData.totalTokensIssued - dashboardData.totalDeliveries),
        performance: dashboardData.totalTokensIssued > 0 && dashboardData.totalDeliveries >= dashboardData.totalTokensIssued * 0.8 ? 'Excellent' :
          dashboardData.totalDeliveries >= dashboardData.totalTokensIssued * 0.6 ? 'Good' : 'Needs Improvement'
      });

      console.log('📊 Final State Summary:');
      console.log('- Dashboard Data:', dashboardData);
      console.log('- Shopkeeper Info:', shopkeeperInfo);
      console.log('- Inventory:', inventory);
      console.log('- Analytics:', analytics);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    if (!contract) return;

    setRefreshing(true);
    try {
      await fetchDashboardData(contract, account);
      setSuccess("Dashboard refreshed successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Action functions for Indian PDS workflow
  const confirmRationReceipt = async (pickupId) => {
    try {
      setLoading(true);
      setError("");

      if (!connected || !account || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      console.log("🎯 Confirming ration receipt for pickup ID:", pickupId);

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Check if the function exists in the contract
      if (!contractWithSigner.confirmRationReceipt) {
        throw new Error("confirmRationReceipt function not found in contract");
      }

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.confirmRationReceipt.estimateGas(
          BigInt(pickupId)
        );
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        // Use a reasonable default gas limit
        gasEstimate = BigInt(300000);
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.confirmRationReceipt(
        BigInt(pickupId), 
        {
          gasLimit: gasEstimate + BigInt(50000), // Add buffer
          gasPrice: ethers.parseUnits("30", "gwei") // Set reasonable gas price for Polygon
        }
      );

      setSuccess("Transaction sent! Waiting for confirmation...");
      console.log("📤 Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
      setSuccess("Ration receipt confirmed successfully! Generating receipt...");

      // Generate delivery receipt for pickup confirmation
      const deliveryData = {
        pickupId: pickupId,
        shopkeeper: account,
        shopkeeperName: shopkeeperInfo?.name || "Unknown Shopkeeper",
        shopkeeperArea: shopkeeperInfo?.area || "Unknown Area",
        timestamp: new Date().toISOString(),
        transactionHash: tx.hash,
        type: "pickup_confirmation"
      };

      const receipt_data = generateDeliveryReceipt(deliveryData, tx.hash);
      setGeneratedReceipt(receipt_data);
      setShowReceiptModal(true);

      // Refresh dashboard after successful transaction
      await refreshDashboard();
      setTimeout(() => setSuccess(""), 5000);

    } catch (error) {
      console.error("❌ Error confirming ration receipt:", error);
      
      let errorMessage = "Failed to confirm ration receipt";
      
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Transaction failed - pickup may already be confirmed or invalid";
      } else if (error.message.includes("Only shopkeeper")) {
        errorMessage = "Only the assigned shopkeeper can confirm this receipt";
      } else if (error.message.includes("Already confirmed")) {
        errorMessage = "This pickup has already been confirmed";
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage = "Network error - please check your connection and try again. Make sure you're on Polygon Amoy testnet.";
      } else if (error.code === "UNKNOWN_ERROR") {
        errorMessage = "Network or contract error - please try again. Ensure you have MATIC for gas fees.";
      } else if (error.message.includes("nonce")) {
        errorMessage = "Transaction nonce error - please reset your MetaMask account or try again";
      } else if (error.message.includes("replacement")) {
        errorMessage = "Transaction replacement error - please wait and try again";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkUnclaimedTokens = async (aadhaar, skipModalDisplay = false, includeClaimedTokens = false) => {
    try {
      console.log(`🔍 Checking tokens for Aadhaar: ${aadhaar}, Include claimed: ${includeClaimedTokens}`);
      setError(""); // Clear previous errors

      // Convert aadhaar to string to avoid BigInt serialization issues
      const aadhaarString = aadhaar.toString();

      // Make API call to backend
      const response = await fetch('/api/admin?endpoint=get-unclaimed-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: aadhaarString,
          includeClaimedTokens: includeClaimedTokens
        })
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("🎫 Tokens response:", result);

      if (result.success && result.tokens && result.tokens.length > 0) {
        if (!skipModalDisplay) {
          // Store tokens for display
          setSelectedConsumerTokens({
            aadhaar: aadhaarString,
            tokens: result.tokens,
            includeClaimedTokens: includeClaimedTokens
          });
          setShowTokensModal(true);

          const tokenTypeText = includeClaimedTokens ? "tokens (claimed + unclaimed)" : "unclaimed tokens";
          setSuccess(`Found ${result.tokens.length} ${tokenTypeText} for consumer with Aadhaar: ${aadhaarString}`);
          setTimeout(() => setSuccess(""), 5000);
        }
        return result.tokens;
      } else {
        if (!skipModalDisplay) {
          const tokenTypeText = includeClaimedTokens ? "tokens" : "unclaimed tokens";
          setError(`No ${tokenTypeText} found for this consumer`);
          setTimeout(() => setError(""), 3000);
        }
        return [];
      }
    } catch (error) {
      console.error("❌ Error checking tokens:", error);
      if (!skipModalDisplay) {
        setError("Failed to check tokens: " + error.message);
        setTimeout(() => setError(""), 3000);
      }
      return [];
    }
  };

  const requestDeliveryAgent = async (consumerAddress) => {
    try {
      setLoading(true);
      setError("");

      console.log("🚚 Requesting delivery agent for consumer:", consumerAddress);

      // Use backend API with admin wallet instead of MetaMask
      const response = await fetch('/api/admin?endpoint=request-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consumerAddress: consumerAddress,
          tokenAmount: 1,
          shopkeeperAddress: account
        })
      });

      const result = await response.json();
      console.log("📝 Delivery request response:", result);

      if (result.success) {
        setSuccess("Delivery agent requested successfully!");
        console.log("✅ Delivery request confirmed:", result.transactionHash);

        // Refresh dashboard data
        if (contract) {
          await fetchDashboardData(contract, account);
        }

        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error(result.error || "Failed to request delivery");
      }
    } catch (error) {
      console.error("❌ Error requesting delivery:", error);
      setError("Failed to request delivery: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Never";
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  // Receipt generation function
  const generateDeliveryReceipt = (delivery, transactionHash) => {
    const now = new Date();
    const receiptId = delivery.type === "pickup_confirmation" 
      ? `PKP-${delivery.pickupId}-${now.getTime()}`
      : `RCP-${delivery.pickupId || delivery.tokenId}-${now.getTime()}`;

    // Handle pickup confirmation receipts
    if (delivery.type === "pickup_confirmation") {
      return {
        receiptId,
        pickupId: delivery.pickupId,
        transactionHash,
        shopkeeperName: delivery.shopkeeperName,
        shopkeeperAddress: delivery.shopkeeper,
        shopkeeperArea: delivery.shopkeeperArea,
        generatedAt: now.toISOString(),
        status: "PICKUP CONFIRMED",
        blockchainNetwork: "Polygon Amoy Testnet",
        contractAddress: CONTRACT_ADDRESS,
        type: "pickup_confirmation",
        confirmedTime: Math.floor(Date.now() / 1000),
        estimatedValue: 0, // No specific value for pickup confirmation
        deliveryMethod: "Pickup Confirmation",
        paymentStatus: "Not Applicable",
        isVerified: true
      };
    }

    // Handle token delivery receipts (existing logic)
    return {
      receiptId,
      pickupId: delivery.pickupId,
      transactionHash,
      shopkeeperName: shopkeeperInfo?.name || "Shopkeeper",
      shopkeeperAddress: account,
      deliveryAgentName: delivery.deliveryAgentName || `Agent ${delivery.deliveryAgent?.slice(-4).toUpperCase()}`,
      deliveryAgentAddress: delivery.deliveryAgent,
      rationAmount: delivery.rationAmount,
      category: delivery.category,
      pickupLocation: delivery.pickupLocation,
      deliveryInstructions: delivery.deliveryInstructions,
      assignedTime: delivery.assignedTime,
      pickedUpTime: delivery.pickedUpTime,
      deliveredTime: delivery.deliveredTime,
      confirmedTime: Math.floor(Date.now() / 1000),
      generatedAt: now.toISOString(),
      estimatedValue: delivery.rationAmount * 25, // ₹25 per kg estimate
      status: "CONFIRMED",
      blockchainNetwork: "Polygon Amoy Testnet",
      contractAddress: CONTRACT_ADDRESS
    };
  };

  // Print receipt function
  const printReceipt = (receiptData) => {
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Receipt - ${receiptData.receiptId}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 20px; background: white; }
          .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #666; }
          .section { margin: 15px 0; }
          .label { font-weight: bold; display: inline-block; width: 120px; }
          .value { display: inline-block; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; }
          .blockchain { background: #f0f0f0; padding: 10px; margin: 10px 0; font-size: 10px; }
          .status { background: #d4edda; color: #155724; padding: 5px 10px; text-align: center; font-weight: bold; }
          .payment-section { background: #f8f9fa; padding: 10px; margin: 10px 0; border: 1px solid #dee2e6; }
          @media print { body { margin: 0; } .receipt { border: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">🏪 GRAINLY PDS SYSTEM</div>
            <div class="subtitle">Ration Delivery Receipt</div>
            <div class="subtitle">Receipt ID: ${receiptData.receiptId}</div>
          </div>
          
          <div class="status">✅ DELIVERY CONFIRMED</div>
          
          <div class="section">
            <div><span class="label">Token ID:</span> <span class="value">#${receiptData.tokenId}</span></div>
            <div><span class="label">Date & Time:</span> <span class="value">${new Date(receiptData.generatedAt).toLocaleString()}</span></div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div><span class="label">Consumer:</span> <span class="value">${receiptData.consumerName}</span></div>
            <div><span class="label">Aadhaar:</span> <span class="value">${receiptData.consumerAadhaar}</span></div>
            ${receiptData.consumerMobile && receiptData.consumerMobile !== 'Not Available' ? 
              `<div><span class="label">Mobile:</span> <span class="value">${receiptData.consumerMobile}</span></div>` : ''}
          </div>
          
          <div class="section">
            <div><span class="label">Shopkeeper:</span> <span class="value">${receiptData.shopkeeperName}</span></div>
            <div><span class="label">Shop Area:</span> <span class="value">${receiptData.shopkeeperArea}</span></div>
            <div><span class="label">Shop Address:</span> <span class="value">${receiptData.shopkeeperAddress.slice(0, 10)}...${receiptData.shopkeeperAddress.slice(-8)}</span></div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div><span class="label">Ration Amount:</span> <span class="value">${receiptData.rationAmount} kg</span></div>
            <div><span class="label">Category:</span> <span class="value">${receiptData.category}</span></div>
            <div><span class="label">Delivery Method:</span> <span class="value">${receiptData.deliveryMethod}</span></div>
          </div>
          
          <div class="payment-section">
            <div><strong>Payment Details:</strong></div>
            <div><span class="label">Total Value:</span> <span class="value">₹${receiptData.estimatedValue.toLocaleString()}</span></div>
            <div><span class="label">Subsidy (70%):</span> <span class="value">₹${receiptData.subsidyAmount.toLocaleString()}</span></div>
            <div><span class="label">Consumer Paid:</span> <span class="value">₹${receiptData.consumerPayment.toLocaleString()}</span></div>
            <div><span class="label">Status:</span> <span class="value">${receiptData.paymentStatus}</span></div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div><span class="label">Token Issued:</span> <span class="value">${new Date(receiptData.issuedTime * 1000).toLocaleString()}</span></div>
            <div><span class="label">Token Claimed:</span> <span class="value">${new Date(receiptData.claimedTime * 1000).toLocaleString()}</span></div>
            <div><span class="label">Token Expires:</span> <span class="value">${new Date(receiptData.expiryTime * 1000).toLocaleString()}</span></div>
          </div>
          
          <div class="blockchain">
            <div><strong>Blockchain Verification:</strong></div>
            <div>Network: ${receiptData.blockchainNetwork}</div>
            <div>Contract: ${receiptData.contractAddress}</div>
            <div>Tx Hash: ${receiptData.transactionHash}</div>
            <div>Verified: ${receiptData.isVerified ? '✅ Yes' : '❌ No'}</div>
          </div>
          
          <div class="footer">
            <div>This receipt is digitally verified on the blockchain</div>
            <div>Generated by Grainly PDS System</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  // Download receipt as PDF (simplified version)
  const downloadReceipt = (receiptData) => {
    const receiptText = `
GRAINLY PDS SYSTEM - RATION DELIVERY RECEIPT
===========================================

Receipt ID: ${receiptData.receiptId}
Status: ✅ DELIVERY CONFIRMED
Generated: ${new Date(receiptData.generatedAt).toLocaleString()}

CONSUMER DETAILS:
- Name: ${receiptData.consumerName}
- Aadhaar: ${receiptData.consumerAadhaar}
- Mobile: ${receiptData.consumerMobile || 'Not Available'}
- Category: ${receiptData.category}

SHOPKEEPER DETAILS:
- Name: ${receiptData.shopkeeperName}
- Area: ${receiptData.shopkeeperArea}
- Address: ${receiptData.shopkeeperAddress}

RATION INFORMATION:
- Token ID: #${receiptData.tokenId}
- Amount: ${receiptData.rationAmount} kg
- Category: ${receiptData.category}
- Delivery Method: ${receiptData.deliveryMethod}

PAYMENT DETAILS:
- Total Value: ₹${receiptData.estimatedValue.toLocaleString()}
- Government Subsidy (70%): ₹${receiptData.subsidyAmount.toLocaleString()}
- Consumer Payment (30%): ₹${receiptData.consumerPayment.toLocaleString()}
- Payment Status: ${receiptData.paymentStatus}

TOKEN TIMELINE:
- Issued: ${new Date(receiptData.issuedTime * 1000).toLocaleString()}
- Claimed: ${new Date(receiptData.claimedTime * 1000).toLocaleString()}
- Expires: ${new Date(receiptData.expiryTime * 1000).toLocaleString()}

BLOCKCHAIN VERIFICATION:
- Network: ${receiptData.blockchainNetwork}
- Contract: ${receiptData.contractAddress}
- Transaction Hash: ${receiptData.transactionHash}
- Verified: ${receiptData.isVerified ? 'Yes' : 'No'}

This receipt is digitally verified on the blockchain.
Generated by Grainly PDS System.
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grainly-receipt-${receiptData.receiptId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  🏪
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {shopkeeperInfo?.name || "Shopkeeper Dashboard"}
                  </h1>
                  <p className="text-blue-600 font-semibold">
                    Address: {shopkeeperInfo?.shopkeeperAddress?.slice(0, 10)}...{shopkeeperInfo?.shopkeeperAddress?.slice(-8)}
                  </p>
                  <p className="text-gray-600">
                    Area: {shopkeeperInfo?.area || "Not Set"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={shopkeeperInfo?.isActive ? "default" : "secondary"} className="bg-green-100 text-green-800">
                    {shopkeeperInfo?.isActive ? "Active Shop" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">📍 {shopkeeperInfo?.area}</p>
                <p className="text-sm text-gray-600">� Consumers: {shopkeeperInfo?.totalConsumersAssigned || 0}</p>
                <p className="text-sm text-gray-600">🎫 Tokens: {shopkeeperInfo?.totalTokensIssued || 0}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={refreshDashboard}
                variant="outline"
                disabled={refreshing}
                className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="consumers">Consumers</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned Consumers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData?.assignedConsumers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active: {dashboardData?.activeConsumers || 0}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Tokens</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.monthlyTokensIssued || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Issued this month
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.totalTokensIssued || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime total
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.totalDeliveries || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completed deliveries
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Additional Dashboard Info */}
            {dashboardData && (
              <motion.div variants={containerVariants} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shopkeeper Status</CardTitle>
                    <CardDescription>Your account status and performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium">Account Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={dashboardData.isActive ? "default" : "secondary"}>
                            {dashboardData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registration Date</label>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(dashboardData.registrationTime)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Performance Rate</label>
                        <p className="text-sm text-gray-600 mt-1">
                          {analytics?.claimRate || 0}% claim rate
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Consumers Tab */}
          <TabsContent value="consumers">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Consumers</CardTitle>
                  <CardDescription>
                    Manage your assigned consumers and their ration distribution.
                    Total: {dashboardData?.assignedConsumers || 0} |
                    Active: {dashboardData?.activeConsumers || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!assignedConsumers || assignedConsumers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No consumers assigned yet</p>
                        <p className="text-sm text-gray-400">
                          Contact admin to get consumers assigned to your shop
                        </p>
                      </div>
                    ) : (
                      assignedConsumers.map((consumer, index) => (
                        <motion.div
                          key={consumer.aadhaar || consumer.walletAddress || index}
                          variants={itemVariants}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900">
                                {consumer.name || `Consumer ${index + 1}`}
                              </h3>
                              <Badge variant={consumer.isActive ? "default" : "secondary"}>
                                {consumer.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {consumer.category && (
                                <Badge variant="outline">
                                  {consumer.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {consumer.mobile && (
                                <p><Phone className="inline h-3 w-3 mr-1" />{consumer.mobile}</p>
                              )}
                              {consumer.aadhaar && (
                                <p>Aadhaar: {consumer.aadhaar}</p>
                              )}
                              {consumer.walletAddress && (
                                <p className="font-mono text-xs">
                                  Wallet: {consumer.walletAddress.slice(0, 10)}...{consumer.walletAddress.slice(-8)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  // First check for unclaimed tokens
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar, true); // Skip modal display
                                  if (tokens && tokens.length > 0) {
                                    // Use the first available token
                                    const tokenToDeliver = tokens[0];
                                    console.log("📦 Delivering token:", tokenToDeliver);

                                    // Extract token ID (adjust based on your token structure)
                                    const tokenId = tokenToDeliver.tokenId || tokenToDeliver.id || tokenToDeliver;
                                    await markRationDelivered(consumer.aadhaar, tokenId);
                                  } else {
                                    setError("No unclaimed tokens found for this consumer");
                                  }
                                } else {
                                  setError("Consumer Aadhaar number not available");
                                }
                              }}
                              disabled={!consumer.isActive || !consumer.aadhaar || loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              ✓ Mark Delivered & Generate Receipt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (consumer.walletAddress) {
                                  requestDeliveryAgent(consumer.walletAddress);
                                } else {
                                  setError("Consumer wallet address not available");
                                }
                              }}
                              disabled={!consumer.walletAddress || loading}
                            >
                              🚚 Request Delivery
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar, false, false);
                                  if (tokens.length > 0) {
                                    setSuccess(`Found ${tokens.length} unclaimed tokens for this consumer`);
                                  } else {
                                    setError("No unclaimed tokens found");
                                  }
                                }
                              }}
                              disabled={!consumer.aadhaar}
                            >
                              🔍 Unclaimed Tokens
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar, false, true);
                                  if (tokens.length > 0) {
                                    setSuccess(`Found ${tokens.length} total tokens (claimed + unclaimed) for this consumer`);
                                  } else {
                                    setError("No tokens found");
                                  }
                                }
                              }}
                              disabled={!consumer.aadhaar}
                            >
                              📋 All Tokens
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {dashboardData && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Quick Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600">Total Assigned:</span>
                          <p className="font-bold text-blue-900">{dashboardData.assignedConsumers}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Active:</span>
                          <p className="font-bold text-blue-900">{dashboardData.activeConsumers}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Monthly Tokens:</span>
                          <p className="font-bold text-blue-900">{dashboardData.monthlyTokensIssued}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Completion Rate:</span>
                          <p className="font-bold text-blue-900">
                            {dashboardData.assignedConsumers > 0 ?
                              Math.round((dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <Card>
                <CardHeader>
                  <CardTitle>Token Inventory</CardTitle>
                  <CardDescription>Track DCVTokens and ration distribution for your assigned consumers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Monthly Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {dashboardData?.monthlyTokensIssued || 0}
                        </p>
                        <p className="text-sm text-green-700">Issued this month</p>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Total Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {dashboardData?.totalTokensIssued || 0}
                        </p>
                        <p className="text-sm text-blue-700">Lifetime total</p>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-orange-900">Delivered</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                          {dashboardData?.totalDeliveries || 0}
                        </p>
                        <p className="text-sm text-orange-700">Completed deliveries</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Token Status & Management</h4>

                      {/* Debug Info */}
                      {/* <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                        <h5 className="text-sm font-medium text-yellow-800 mb-2">Debug Information:</h5>
                        <div className="text-xs text-yellow-700 space-y-1">
                          <p>• Inventory data: {inventory ? 'Available' : 'Not loaded'}</p>
                          <p>• Unclaimed tokens: {inventory?.unclaimedTokens ? inventory.unclaimedTokens.length : 'None'}</p>
                          <p>• Dashboard data: {dashboardData ? 'Loaded' : 'Not loaded'}</p>
                          <p>• Contract instance: {contract ? 'Connected' : 'Not connected'}</p>
                        </div>
                      </div> */}

                      {inventory?.unclaimedTokens && inventory.unclaimedTokens.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600 font-medium mb-3">
                            ✅ Found {inventory.unclaimedTokens.length} unclaimed tokens
                          </p>
                          {inventory.unclaimedTokens.slice(0, 5).map((token, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                              <div>
                                <span className="font-medium">Token #{token.tokenId || token.id || index + 1}</span>
                                <p className="text-sm text-gray-600">
                                  {token.aadhaar ? `Aadhaar: ${token.aadhaar}` : 'Consumer info not available'}
                                </p>
                                {token.rationAmount && (
                                  <p className="text-sm text-gray-600">Amount: {token.rationAmount} kg</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                Pending
                              </Badge>
                            </div>
                          ))}
                          {inventory.unclaimedTokens.length > 5 && (
                            <p className="text-sm text-gray-500 text-center">
                              +{inventory.unclaimedTokens.length - 5} more unclaimed tokens
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No unclaimed tokens found</p>
                          <p className="text-sm text-gray-400">
                            {dashboardData ?
                              `All ${dashboardData.totalTokensIssued} tokens have been delivered` :
                              'Loading token information...'
                            }
                          </p>
                          {/* Add a refresh button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log("🔄 Manual refresh clicked");
                              refreshDashboard();
                            }}
                            className="mt-3"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Tokens
                          </Button>
                        </div>
                      )}
                    </div>

                    {dashboardData && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Distribution Efficiency</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Claim Rate</span>
                            <span className="text-sm font-medium">
                              {dashboardData.assignedConsumers > 0 ?
                                Math.round((dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100) : 0}%
                            </span>
                          </div>
                          <Progress
                            value={dashboardData.assignedConsumers > 0 ?
                              (dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Incoming Deliveries Tab */}
          <TabsContent value="incoming">
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Incoming Deliveries
                  </CardTitle>
                  <CardDescription>
                    Track ration deliveries coming to your shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomingDeliveriesSection
                    contract={contract}
                    account={account}
                    provider={provider}
                    refreshDashboard={refreshDashboard}
                    generateDeliveryReceipt={generateDeliveryReceipt}
                    setGeneratedReceipt={setGeneratedReceipt}
                    setShowReceiptModal={setShowReceiptModal}
                    shopkeeperInfo={shopkeeperInfo}
                    confirmRationReceipt={confirmRationReceipt}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Other tabs would follow similar pattern */}
          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Management</CardTitle>
                <CardDescription>Track pending and completed deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">Delivery data will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View your earnings and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">Payment data will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Your overall performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData && analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Delivery Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {analytics.claimRate}%
                        </p>
                        <p className="text-sm text-blue-700">
                          {dashboardData.totalDeliveries} of {dashboardData.assignedConsumers} consumers
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Active Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {analytics.activeRate}%
                        </p>
                        <p className="text-sm text-green-700">
                          {dashboardData.activeConsumers} active consumers
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-purple-900">Monthly Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {dashboardData.monthlyTokensIssued}
                        </p>
                        <p className="text-sm text-purple-700">
                          This month's distribution
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Performance Overview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Assigned:</span>
                          <p className="font-bold text-gray-900">{dashboardData.assignedConsumers}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Delivered:</span>
                          <p className="font-bold text-gray-900">{dashboardData.totalDeliveries}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Tokens:</span>
                          <p className="font-bold text-gray-900">{dashboardData.totalTokensIssued}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account Status:</span>
                          <p className="font-bold text-gray-900">
                            {dashboardData.isActive ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">Recent Activity</h4>
                      <p className="text-sm text-orange-700">
                        Registered: {formatDate(dashboardData.registrationTime)}
                      </p>
                      <p className="text-sm text-orange-700">
                        Last updated: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading analytics data...</p>
                    <p className="text-sm text-gray-400">Please wait while we fetch your performance metrics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tokens Modal */}
        {showTokensModal && selectedConsumerTokens && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[85vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedConsumerTokens.includeClaimedTokens ? 'All Tokens' : 'Unclaimed Tokens'} for Consumer
                  </h3>
                  <p className="text-gray-600">Aadhaar: {selectedConsumerTokens.aadhaar}</p>
                  <p className="text-sm text-blue-600">
                    Showing {selectedConsumerTokens.includeClaimedTokens ? 'all tokens (claimed + unclaimed)' : 'unclaimed tokens only'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTokensModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left">Token ID</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Ration Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Category</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Issued Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Expiry Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Claimed Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConsumerTokens.tokens.map((token) => {
                      const issuedDate = token.issuedDate || new Date(token.issuedTime * 1000).toLocaleDateString();
                      const expiryDate = token.expiryDate || new Date(token.expiryTime * 1000).toLocaleDateString();
                      const claimedDate = token.claimedDate || (token.isClaimed && token.claimTime > 0 ?
                        new Date(token.claimTime * 1000).toLocaleDateString() : null);
                      const isExpired = token.isExpired || new Date() > new Date(token.expiryTime * 1000);
                      const status = token.status || (token.isClaimed ? 'Claimed' : (isExpired ? 'Expired' : 'Available'));

                      return (
                        <tr key={token.tokenId} className={`hover:bg-gray-50 ${token.isClaimed ? 'bg-green-50' : isExpired ? 'bg-red-50' : 'bg-yellow-50'
                          }`}>
                          <td className="border border-gray-300 px-3 py-3 font-mono text-center">
                            <Badge variant="outline">
                              #{token.tokenId}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center font-semibold">
                            {token.rationAmount} kg
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <Badge variant="secondary">
                              {token.category || 'Standard'}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {issuedDate}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {expiryDate}
                            {token.daysUntilExpiry !== undefined && token.daysUntilExpiry > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                ({token.daysUntilExpiry} days left)
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <Badge
                              variant={
                                token.isClaimed ? "default" :
                                  isExpired ? "destructive" :
                                    "secondary"
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {claimedDate ? (
                              <span className="text-green-600 font-medium">{claimedDate}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {!token.isClaimed && !isExpired && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  markRationDelivered(selectedConsumerTokens.aadhaar, token.tokenId);
                                  setShowTokensModal(false);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                Mark Delivered
                              </Button>
                            )}
                            {token.isClaimed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                ✓ Delivered
                              </Badge>
                            )}
                            {isExpired && !token.isClaimed && (
                              <Badge variant="destructive">
                                ⚠ Expired
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-blue-600 font-medium">Total Tokens</p>
                    <p className="font-bold text-blue-900 text-lg">{selectedConsumerTokens.tokens.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-600 font-medium">Claimed/Delivered</p>
                    <p className="font-bold text-green-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isClaimed).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-yellow-600 font-medium">Available</p>
                    <p className="font-bold text-yellow-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => !t.isClaimed && !t.isExpired).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-600 font-medium">Expired</p>
                    <p className="font-bold text-red-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isExpired || (!t.isClaimed && new Date() > new Date(t.expiryTime * 1000))).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-600 font-medium">Available</p>
                    <p className="font-bold text-green-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => !t.isClaimed && !t.isExpired).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-600 font-medium">Expired</p>
                    <p className="font-bold text-red-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isExpired).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && generatedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-2xl font-bold text-green-800">🧾 Delivery Receipt Generated</h3>
                  <p className="text-gray-600">Receipt ID: {generatedReceipt.receiptId}</p>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              {/* Receipt Preview */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold">🏪 GRAINLY PDS SYSTEM</h4>
                  <p className="text-sm text-gray-600">Ration Delivery Receipt</p>
                  <p className="text-xs text-gray-500">Receipt ID: {generatedReceipt.receiptId}</p>
                </div>

                <div className="bg-green-100 text-green-800 text-center py-2 rounded mb-4 font-bold">
                  {generatedReceipt.type === "pickup_confirmation" ? "✅ PICKUP CONFIRMED" : "✅ DELIVERY CONFIRMED"}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  {generatedReceipt.type === "pickup_confirmation" ? (
                    <>
                      <div>
                        <span className="font-medium text-gray-700">Pickup ID:</span>
                        <p>#{generatedReceipt.pickupId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date & Time:</span>
                        <p>{new Date(generatedReceipt.generatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Shopkeeper:</span>
                        <p>{generatedReceipt.shopkeeperName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Shop Area:</span>
                        <p>{generatedReceipt.shopkeeperArea}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <p className="font-bold text-green-600">{generatedReceipt.status}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Confirmation Type:</span>
                        <p>Pickup Received</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium text-gray-700">Token ID:</span>
                        <p>#{generatedReceipt.tokenId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date & Time:</span>
                        <p>{new Date(generatedReceipt.generatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Consumer:</span>
                        <p>{generatedReceipt.consumerName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Aadhaar:</span>
                        <p>{generatedReceipt.consumerAadhaar}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Shopkeeper:</span>
                        <p>{generatedReceipt.shopkeeperName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Shop Area:</span>
                        <p>{generatedReceipt.shopkeeperArea}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Ration Amount:</span>
                        <p className="font-bold text-green-600">{generatedReceipt.rationAmount} kg</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <p>{generatedReceipt.category}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Value:</span>
                        <p className="font-bold text-blue-600">₹{generatedReceipt.estimatedValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Subsidy:</span>
                        <p className="font-bold text-green-600">₹{generatedReceipt.subsidyAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Consumer Paid:</span>
                        <p className="font-bold text-orange-600">₹{generatedReceipt.consumerPayment.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <p className="font-bold text-green-600">{generatedReceipt.status}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-gray-300 pt-4 mt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Token Timeline:</h5>
                  <div className="text-xs space-y-1">
                    <div>Issued: {new Date(generatedReceipt.issuedTime * 1000).toLocaleString()}</div>
                    <div>Claimed: {new Date(generatedReceipt.claimedTime * 1000).toLocaleString()}</div>
                    <div>Expires: {new Date(generatedReceipt.expiryTime * 1000).toLocaleString()}</div>
                    <div>Receipt Generated: {new Date(generatedReceipt.generatedAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-4 mt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Delivery Information:</h5>
                  <div className="text-xs space-y-1">
                    <div>Method: {generatedReceipt.deliveryMethod}</div>
                    <div>Payment Status: {generatedReceipt.paymentStatus}</div>
                    {generatedReceipt.consumerMobile && generatedReceipt.consumerMobile !== 'Not Available' && (
                      <div>Consumer Mobile: {generatedReceipt.consumerMobile}</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-300 pt-4 mt-4 text-xs text-gray-600">
                  <div><strong>Blockchain Verification:</strong></div>
                  <div>Network: {generatedReceipt.blockchainNetwork}</div>
                  <div>Contract: {generatedReceipt.contractAddress}</div>
                  <div className="break-all">Tx Hash: {generatedReceipt.transactionHash}</div>
                  <div>Verified: {generatedReceipt.isVerified ? '✅ Yes' : '❌ No'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => printReceipt(generatedReceipt)}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  🖨️ Print Receipt
                </Button>
                <Button
                  onClick={() => downloadReceipt(generatedReceipt)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  📥 Download Receipt
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`Receipt ID: ${generatedReceipt.receiptId}\nTransaction: ${generatedReceipt.transactionHash}\nAmount: ${generatedReceipt.rationAmount} kg ${generatedReceipt.category}\nStatus: CONFIRMED`);
                    setSuccess("Receipt details copied to clipboard!");
                    setTimeout(() => setSuccess(""), 3000);
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  📋 Copy Details
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">📋 What happens next?</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  {generatedReceipt.type === "pickup_confirmation" ? (
                    <>
                      <li>• The pickup confirmation has been recorded on the blockchain</li>
                      <li>• This receipt serves as proof that you received the delivery from the agent</li>
                      <li>• The delivery agent's task is now marked as complete</li>
                      <li>• You can print or download this receipt for your records</li>
                      <li>• The pickup status has been updated to confirmed</li>
                      <li>• You can now distribute the ration to your assigned consumers</li>
                    </>
                  ) : (
                    <>
                      <li>• The ration delivery has been confirmed on the blockchain</li>
                      <li>• This receipt serves as proof of successful ration distribution</li>
                      <li>• The consumer has received their subsidized ration</li>
                      <li>• You can print or download this receipt for your records</li>
                      <li>• The token has been marked as claimed and cannot be reused</li>
                      <li>• Government subsidy has been processed automatically</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// Incoming Deliveries Section Component
function IncomingDeliveriesSection({
  contract,
  account,
  provider,
  refreshDashboard,
  generateDeliveryReceipt,
  setGeneratedReceipt,
  setShowReceiptModal,
  shopkeeperInfo,
  confirmRationReceipt
}) {
  const [incomingDeliveries, setIncomingDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // OTP Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [selectedPickupId, setSelectedPickupId] = useState(null);

  useEffect(() => {
    if (contract && account) {
      fetchIncomingDeliveries();
    }
  }, [contract, account]);

  const fetchIncomingDeliveries = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("📦 Fetching incoming deliveries for shopkeeper:", account);
      console.log("📦 Contract available:", !!contract);
      console.log("📦 Contract address:", contract?.target || contract?.address);

      // Try multiple methods to get incoming deliveries
      let deliveries = [];

      // Method 1: Try getMyShopPickups (for deliveries coming to this shop)
      try {
        console.log("📋 Calling getMyShopPickups...");
        const shopPickups = await contract.getMyShopPickups();
        console.log("📋 Raw shop pickups:", shopPickups);

        if (shopPickups && Array.isArray(shopPickups)) {
          deliveries = shopPickups.map(pickup => ({
            pickupId: Number(pickup.pickupId || pickup[0]),
            deliveryAgent: pickup.deliveryAgent || pickup[1],
            shopkeeper: pickup.shopkeeper || pickup[2],
            rationAmount: Number(pickup.rationAmount || pickup[3]),
            category: pickup.category || pickup[4] || "Unknown",
            status: Number(pickup.status || pickup[5]),
            assignedTime: Number(pickup.assignedTime || pickup[6]),
            pickedUpTime: Number(pickup.pickedUpTime || pickup[7]),
            deliveredTime: Number(pickup.deliveredTime || pickup[8]),
            confirmedTime: Number(pickup.confirmedTime || pickup[9]),
            pickupLocation: pickup.pickupLocation || pickup[10] || "Unknown Location",
            deliveryInstructions: pickup.deliveryInstructions || pickup[11] || "",
            isCompleted: Boolean(pickup.isCompleted !== undefined ? pickup.isCompleted : pickup[12])
          }));

          console.log("✅ Found", deliveries.length, "shop pickups");

          // Filter for deliveries that need shopkeeper action
          const needsConfirmation = deliveries.filter(d => d.status === 3 && !d.isCompleted);
          const inTransit = deliveries.filter(d => d.status === 2);
          const confirmed = deliveries.filter(d => d.status === 4 || d.isCompleted);

          console.log("📊 Delivery status breakdown:");
          console.log("- Needs confirmation (status 3):", needsConfirmation.length);
          console.log("- In transit (status 2):", inTransit.length);
          console.log("- Confirmed (status 4):", confirmed.length);
        }
      } catch (shopPickupsError) {
        console.warn("⚠️ getMyShopPickups failed:", shopPickupsError.message);
        console.log("🔍 Trying alternative methods to fetch deliveries...");

        // Method 2: Try calling the function with the shopkeeper's wallet context
        try {
          console.log("📋 Trying getMyShopPickups with signer...");

          if (provider) {
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();
            const contractWithSigner = contract.connect(signer);

            const shopPickupsWithSigner = await contractWithSigner.getMyShopPickups();
            console.log("📋 Shop pickups with signer:", shopPickupsWithSigner);

            if (shopPickupsWithSigner && Array.isArray(shopPickupsWithSigner)) {
              deliveries = shopPickupsWithSigner.map(pickup => ({
                pickupId: Number(pickup.pickupId || pickup[0]),
                deliveryAgent: pickup.deliveryAgent || pickup[1],
                shopkeeper: pickup.shopkeeper || pickup[2],
                rationAmount: Number(pickup.rationAmount || pickup[3]),
                category: pickup.category || pickup[4] || "Unknown",
                status: Number(pickup.status || pickup[5]),
                assignedTime: Number(pickup.assignedTime || pickup[6]),
                pickedUpTime: Number(pickup.pickedUpTime || pickup[7]),
                deliveredTime: Number(pickup.deliveredTime || pickup[8]),
                confirmedTime: Number(pickup.confirmedTime || pickup[9]),
                pickupLocation: pickup.pickupLocation || pickup[10] || "Unknown Location",
                deliveryInstructions: pickup.deliveryInstructions || pickup[11] || "",
                isCompleted: Boolean(pickup.isCompleted !== undefined ? pickup.isCompleted : pickup[12])
              }));

              console.log(`📋 Found ${deliveries.length} pickups with signer`);
            }
          }
        } catch (signerError) {
          console.warn("⚠️ getMyShopPickups with signer also failed:", signerError.message);
        }
      }

      // If still no deliveries found from blockchain, that's it - no mock data
      if (deliveries.length === 0) {
        console.log("📝 No deliveries found from blockchain - showing empty state");
        console.log("🔍 This could mean:");
        console.log("  - No deliveries have been assigned to this shopkeeper");
        console.log("  - The contract functions getMyShopPickups/getAllPickups don't exist");
        console.log("  - The shopkeeper address is not registered in the system");
        console.log("  - Network/contract connection issues");
      }

      // Enhance deliveries with additional info
      const enhancedDeliveries = await Promise.all(deliveries.map(async (delivery) => {
        // Try to get delivery agent name if not available
        if (!delivery.deliveryAgentName && delivery.deliveryAgent) {
          try {
            const agentInfo = await contract.getDeliveryAgentInfo(delivery.deliveryAgent);
            delivery.deliveryAgentName = agentInfo.agentName || agentInfo.name || agentInfo[1] ||
              `Agent ${delivery.deliveryAgent.slice(-4).toUpperCase()}`;
            delivery.deliveryAgentMobile = agentInfo.mobile || agentInfo[2] || "Not Available";
          } catch (agentError) {
            delivery.deliveryAgentName = `Agent ${delivery.deliveryAgent.slice(-4).toUpperCase()}`;
            delivery.deliveryAgentMobile = "Not Available";
          }
        }

        // Calculate ETA if not set
        if (!delivery.estimatedArrival && delivery.status === 2) {
          // If in transit, estimate 30-60 minutes
          delivery.estimatedArrival = Math.floor(Date.now() / 1000) + (Math.random() * 1800 + 1800);
        }

        return delivery;
      }));

      console.log("✅ Final enhanced deliveries:", enhancedDeliveries);
      setIncomingDeliveries(enhancedDeliveries);

    } catch (error) {
      console.error("❌ Error fetching incoming deliveries:", error);
      setError("Failed to fetch incoming deliveries: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmReceipt = async (pickupId) => {
    try {
      setLoading(true);
      setError("");

      if (!contract) {
        throw new Error("Contract not initialized");
      }

      console.log("✅ Confirming receipt for pickup ID:", pickupId);

      // Get the delivery details before confirming
      const delivery = incomingDeliveries.find(d => d.pickupId === pickupId);
      if (!delivery) {
        throw new Error("Delivery not found");
      }

      // Get signer from MetaMask
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Validate pickup ID
      if (!pickupId || pickupId <= 0) {
        throw new Error("Invalid pickup ID");
      }

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.confirmRationReceipt.estimateGas(BigInt(pickupId));
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        gasEstimate = BigInt(300000); // Default gas limit
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.confirmRationReceipt(BigInt(pickupId), {
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: ethers.parseUnits("30", "gwei") // Set reasonable gas price for Polygon
      });

      setSuccess("Transaction sent! Confirming receipt...");
      console.log("📤 Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);

      // Generate and show receipt if functions are available
      if (generateDeliveryReceipt && setGeneratedReceipt && setShowReceiptModal) {
        const receiptData = generateDeliveryReceipt(delivery, receipt.hash);
        setGeneratedReceipt(receiptData);
        setShowReceiptModal(true);
      }

      setSuccess("Receipt confirmed successfully! Refreshing dashboard...");

      // Update the specific delivery in state immediately for better UX
      setIncomingDeliveries(prevDeliveries =>
        prevDeliveries.map(d =>
          d.pickupId === pickupId
            ? { ...d, confirmedTime: Math.floor(Date.now() / 1000), isCompleted: true, status: 4 }
            : d
        )
      );

      // Refresh data from blockchain
      await fetchIncomingDeliveries();
      if (refreshDashboard) {
        await refreshDashboard();
      }

      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error confirming receipt:", error);

      let errorMessage = "Failed to confirm receipt";

      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Transaction failed - pickup may already be confirmed or invalid";
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage = "Network error - please check your connection and try again";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Functions
  const handleOtpVerification = (pickupId) => {
    setSelectedPickupId(pickupId);
    setOtpValue("");
    setOtpError("");
    setShowOtpModal(true);
  };

  const verifyOtp = async () => {
    if (!otpValue || otpValue.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    // Validate OTP format
    if (!OTPService.validateOTPFormat(otpValue)) {
      setOtpError("Invalid OTP format. Please enter 6 digits.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      console.log("🔍 Verifying OTP with MongoDB backend...");

      // Verify OTP using the backend service
      const verificationResult = await OTPService.verifyOTP({
        pickupId: selectedPickupId.toString(),
        shopkeeperAddress: account,
        otpCode: otpValue
      });

      if (!verificationResult.success) {
        setOtpError(verificationResult.message || "Invalid OTP. Please try again.");
        return;
      }

      console.log("✅ OTP Verified Successfully!");
      console.log("📍 Delivery Agent:", verificationResult.data.deliveryAgentAddress);
      console.log("⏰ Verified at:", verificationResult.data.verifiedAt);

      // OTP is valid, close modal and proceed with confirmation
      setShowOtpModal(false);
      setOtpValue("");
      setOtpError("");
      
      // Show success message
      setSuccess(`OTP verified successfully! Proceeding with delivery confirmation for Pickup #${selectedPickupId}`);
      
      // Call the original confirm receipt function
      await confirmRationReceipt(selectedPickupId);
      
    } catch (error) {
      console.error("❌ OTP verification error:", error);
      setOtpError(`Failed to verify OTP: ${error.message}`);
    } finally {
      setOtpLoading(false);
    }
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtpValue("");
    setOtpError("");
    setSelectedPickupId(null);
    setOtpLoading(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: "Assigned", color: "bg-blue-100 text-blue-800", icon: "📋" },
      1: { label: "Picked Up", color: "bg-yellow-100 text-yellow-800", icon: "📦" },
      2: { label: "In Transit", color: "bg-orange-100 text-orange-800", icon: "🚚" },
      3: { label: "Delivered", color: "bg-green-100 text-green-800", icon: "✅" },
      4: { label: "Confirmed", color: "bg-green-100 text-green-800", icon: "✅" }
    };

    const statusInfo = statusMap[status] || { label: "Unknown", color: "bg-gray-100 text-gray-800", icon: "❓" };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.icon} {statusInfo.label}
      </Badge>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Not set";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  if (loading && incomingDeliveries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading incoming deliveries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Header and Summary */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Expected Deliveries</h3>
        <div className="flex gap-2">
          <Button
            onClick={fetchIncomingDeliveries}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={async () => {
              console.log("🔍 DEBUG: Comprehensive ABI and Contract Analysis...");
              console.log("Contract:", contract);
              console.log("Account:", account);

              try {
                // Initialize debug results first
                let debugResults = {
                  abiMapInfo: {},
                  abiLength: 0,
                  totalFunctions: 0,
                  pickupFunctions: [],
                  functionTests: {}
                };

                // 1. Check ABI structure
                console.log("=== ABI STRUCTURE DEBUG ===");
                console.log("DiamondMergedABI keys:", Object.keys(DiamondMergedABI));

                // Check abiMap specifically
                if (DiamondMergedABI.abiMap) {
                  debugResults.abiMapInfo.exists = true;
                  debugResults.abiMapInfo.contracts = Object.keys(DiamondMergedABI.abiMap);
                  debugResults.abiMapInfo.hasRationPickupFacet = !!DiamondMergedABI.abiMap.RationPickupFacet;

                  console.log("abiMap contracts:", Object.keys(DiamondMergedABI.abiMap));
                  console.log("RationPickupFacet exists in abiMap:", !!DiamondMergedABI.abiMap.RationPickupFacet);

                  if (DiamondMergedABI.abiMap.RationPickupFacet) {
                    console.log("RationPickupFacet ABI length:", DiamondMergedABI.abiMap.RationPickupFacet.length);
                    const pickupFunctions = DiamondMergedABI.abiMap.RationPickupFacet.filter(item =>
                      item.type === 'function' && item.name && (
                        item.name.includes('pickup') ||
                        item.name.includes('Pickup') ||
                        item.name.includes('confirm') ||
                        item.name.includes('Confirm')
                      )
                    );
                    console.log("Pickup functions in RationPickupFacet:", pickupFunctions.map(f => f.name));
                    debugResults.abiMapInfo.rationPickupFunctions = pickupFunctions.map(f => f.name);
                  }
                } else {
                  debugResults.abiMapInfo.exists = false;
                }

                const mergedABI = getMergedABI();
                console.log("Merged ABI length:", mergedABI.length);
                debugResults.abiLength = mergedABI.length;

                // 2. List all available functions
                const functions = mergedABI.filter(item => item.type === 'function');
                console.log("Available functions:", functions.map(f => f.name));
                debugResults.totalFunctions = functions.length;

                // 3. Search for pickup-related functions
                const pickupFunctions = functions.filter(f =>
                  f.name.toLowerCase().includes('pickup') ||
                  f.name.toLowerCase().includes('shop') ||
                  f.name.toLowerCase().includes('delivery')
                );
                console.log("Pickup/Shop/Delivery related functions:", pickupFunctions.map(f => f.name));
                debugResults.pickupFunctions = pickupFunctions.map(f => f.name);

                // 4. Test specific functions
                const hasGetMyShopPickups = contract.getMyShopPickups !== undefined;
                const hasConfirmReceipt = contract.confirmRationReceipt !== undefined;
                const hasGetShopkeeperDashboard = contract.getShopkeeperDashboard !== undefined;

                console.log("Function availability:");
                console.log("- getMyShopPickups:", hasGetMyShopPickups);
                console.log("- confirmRationReceipt:", hasConfirmReceipt);
                console.log("- getShopkeeperDashboard:", hasGetShopkeeperDashboard);

                // Update function tests
                debugResults.functionTests = {
                  getMyShopPickups: hasGetMyShopPickups,
                  confirmRationReceipt: hasConfirmReceipt,
                  getShopkeeperDashboard: hasGetShopkeeperDashboard
                };

                if (hasGetMyShopPickups) {
                  try {
                    console.log("Testing getMyShopPickups...");
                    const result = await contract.getMyShopPickups();

                    // Convert result to a serializable format
                    if (Array.isArray(result)) {
                      debugResults.getMyShopPickupsResult = {
                        type: 'array',
                        length: result.length,
                        sample: result.length > 0 ? 'Has data' : 'Empty array'
                      };
                    } else {
                      debugResults.getMyShopPickupsResult = {
                        type: typeof result,
                        value: result ? 'Has value' : 'No value'
                      };
                    }

                    console.log("getMyShopPickups result:", result);
                  } catch (callError) {
                    debugResults.getMyShopPickupsError = callError.message;
                    console.error("getMyShopPickups call error:", callError);
                  }
                }

                // Convert BigInt values to strings for JSON serialization
                const serializableResults = JSON.parse(JSON.stringify(debugResults, (key, value) =>
                  typeof value === 'bigint' ? value.toString() + 'n' : value
                ));

                alert(`Debug Results:\n${JSON.stringify(serializableResults, null, 2)}`);

              } catch (error) {
                console.error("Debug error:", error);
                alert(`Debug Error: ${error.message}`);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Debug ABI
          </Button>
        </div>
      </div>

      {/* Quick Summary */}
      {incomingDeliveries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {incomingDeliveries.length}
            </div>
            <div className="text-sm text-blue-700">Total Deliveries</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {incomingDeliveries.filter(d => d.status === 2).length}
            </div>
            <div className="text-sm text-orange-700">In Transit</div>
          </div>
          <div className={`border rounded-lg p-3 text-center ${incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length > 0
            ? 'bg-red-50 border-red-200 animate-pulse'
            : 'bg-yellow-50 border-yellow-200'
            }`}>
            <div className={`text-2xl font-bold ${incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length > 0
              ? 'text-red-600'
              : 'text-yellow-600'
              }`}>
              {incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length}
            </div>
            <div className={`text-sm ${incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length > 0
              ? 'text-red-700 font-semibold'
              : 'text-yellow-700'
              }`}>
              {incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length > 0
                ? '🚨 Need Confirmation'
                : 'Awaiting Delivery'
              }
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {incomingDeliveries.reduce((sum, d) => sum + d.rationAmount, 0)} kg
            </div>
            <div className="text-sm text-green-700">Total Ration</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              ₹{incomingDeliveries.reduce((sum, d) => sum + (d.rationAmount * 25), 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-700">Est. Value</div>
          </div>
        </div>
      )}

      {/* Action Required Alert */}
      {incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length > 0 && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>🚨 ACTION REQUIRED:</strong> You have {incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length} delivery(s)
                that have arrived and need your confirmation. Please scroll down and click "CONFIRM RECEIPT" for each delivered item.
              </div>
              <Button
                onClick={() => {
                  // Scroll to first delivery that needs confirmation
                  const firstDeliveryElement = document.querySelector('[data-needs-confirmation="true"]');
                  if (firstDeliveryElement) {
                    firstDeliveryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                size="sm"
                className="bg-red-600 hover:bg-red-700 ml-4"
              >
                Show Deliveries
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      {/* <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
        <h5 className="text-sm font-medium text-yellow-800 mb-2">Debug Information:</h5>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• Total deliveries found: {incomingDeliveries.length}</p>
          <p>• Deliveries needing confirmation: {incomingDeliveries.filter(d => d.status === 3 && !d.isCompleted && d.confirmedTime === 0).length}</p>
          <p>• Contract available: {contract ? 'Yes' : 'No'}</p>
          <p>• Account: {account ? account.slice(0, 10) + '...' : 'None'}</p>
          {incomingDeliveries.length > 0 && (
            <div>
              <p>• Sample delivery statuses:</p>
              {incomingDeliveries.slice(0, 3).map((d, i) => (
                <p key={i} className="ml-4">
                  - Pickup #{d.pickupId}: Status {d.status}, Completed: {d.isCompleted ? 'Yes' : 'No'}, ConfirmedTime: {d.confirmedTime}
                </p>
              ))}
            </div>
          )}
        </div>
      </div> */}

      {/* Deliveries List */}
      {incomingDeliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No incoming deliveries</p>
          <p className="text-sm">All deliveries have been completed or none are scheduled</p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
            <h6 className="font-medium text-blue-800 mb-2">Possible reasons:</h6>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• No deliveries have been assigned to this shopkeeper</li>
              <li>• The contract function getMyShopPickups() is not available</li>
              <li>• The shopkeeper address is not registered in the system</li>
              <li>• Network/contract connection issues</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {incomingDeliveries.map((delivery) => (
            <div
              key={delivery.pickupId}
              data-needs-confirmation={delivery.status === 3 && !delivery.isCompleted && !delivery.confirmedTime ? "true" : "false"}
              className={`border-2 rounded-xl p-6 space-y-4 transition-all hover:shadow-lg ${delivery.status === 3 && !delivery.isCompleted && !delivery.confirmedTime ? 'border-red-300 bg-red-50 shadow-lg' :
                (delivery.isCompleted || delivery.status === 4 || delivery.confirmedTime > 0) ? 'border-green-200 bg-green-50' :
                  delivery.status === 2 ? 'border-orange-200 bg-orange-50' :
                    delivery.status === 1 ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                }`}>

              {/* Header with Delivery Agent Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    🚚
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {delivery.deliveryAgentName || `Agent ${delivery.deliveryAgent?.slice(-4).toUpperCase()}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      📱 {delivery.deliveryAgentMobile || "Contact via admin"}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {delivery.deliveryAgent?.slice(0, 10)}...{delivery.deliveryAgent?.slice(-8)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-white">Pickup #{delivery.pickupId}</Badge>
                    {getStatusBadge(delivery.status)}
                  </div>

                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-3">📦 Delivery Details</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Ration Amount:</span>
                    <p className="text-lg font-bold text-green-600">{delivery.rationAmount} kg</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <p className="font-semibold">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {delivery.category}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">From Location:</span>
                    <p className="font-semibold">{delivery.pickupLocation}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery Value:</span>
                    <p className="font-bold text-green-600">
                      ₹{(delivery.rationAmount * 25).toLocaleString()} {/* Estimated value */}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline and Status */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-3">⏰ Delivery Timeline</h5>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Assigned</span>
                      <p className="text-xs text-gray-600">{formatDate(delivery.assignedTime)}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">✓ Done</Badge>
                  </div>

                  {delivery.pickedUpTime > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Picked Up from {delivery.pickupLocation}</span>
                        <p className="text-xs text-gray-600">{formatDate(delivery.pickedUpTime)}</p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">✓ Done</Badge>
                    </div>
                  )}

                  {delivery.status === 2 && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">In Transit to Your Shop</span>
                        <p className="text-xs text-gray-600">
                          {delivery.estimatedArrival ?
                            `ETA: ${formatDate(delivery.estimatedArrival)}` :
                            "Arriving soon..."
                          }
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 animate-pulse">
                        🚚 On the way
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${delivery.deliveredTime > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Delivered to Shop</span>
                      <p className="text-xs text-gray-600">
                        {delivery.deliveredTime > 0 ? formatDate(delivery.deliveredTime) : "Pending delivery"}
                      </p>
                    </div>
                    {delivery.deliveredTime > 0 ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">✓ Done</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">Pending</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${(delivery.confirmedTime > 0 || delivery.isCompleted || delivery.status === 4) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Receipt Confirmed</span>
                      <p className="text-xs text-gray-600">
                        {(delivery.confirmedTime > 0 || delivery.isCompleted || delivery.status === 4) ?
                          formatDate(delivery.confirmedTime > 0 ? delivery.confirmedTime : delivery.deliveredTime) :
                          "Awaiting confirmation"}
                      </p>
                    </div>
                    {(delivery.confirmedTime > 0 || delivery.isCompleted || delivery.status === 4) ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">✓ Confirmed</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {delivery.deliveryInstructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-amber-800">Special Instructions</h5>
                      <p className="text-amber-700 text-sm mt-1">{delivery.deliveryInstructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ETA and Contact Info */}
              {delivery.status === 2 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-green-800">🕒 Expected Arrival</h5>
                      <p className="text-green-700">
                        {delivery.estimatedArrival ?
                          `${Math.ceil((delivery.estimatedArrival - Date.now() / 1000) / 60)} minutes` :
                          "Within 1 hour"
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600">📞 Contact Agent:</p>
                      <p className="font-semibold text-green-800">
                        {delivery.deliveryAgentMobile || "Via Admin"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {delivery.status === 0 && "⏳ Waiting for pickup"}
                  {delivery.status === 1 && "📦 Agent has collected the ration"}
                  {delivery.status === 2 && "🚚 Agent is on the way to your shop"}
                  {delivery.status === 3 && !delivery.isCompleted && delivery.confirmedTime === 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-red-600">📍 DELIVERED - ACTION REQUIRED: Please confirm receipt!</span>
                    </div>
                  )}
                  {(delivery.status === 4 || delivery.isCompleted || delivery.confirmedTime > 0) && "✅ Delivery completed and confirmed"}
                </div>

                <div className="flex gap-2">
                  {delivery.status === 3 && !delivery.isCompleted && delivery.confirmedTime === 0 && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => confirmReceipt(delivery.pickupId)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 animate-pulse"
                        size="lg"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {loading ? "Confirming..." : "✅ CONFIRM RECEIPT"}
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        Click to complete delivery
                      </p>
                    </div>
                  )}

                  {(delivery.isCompleted || delivery.status === 4 || delivery.confirmedTime > 0) && (
                    <Badge className="bg-green-100 text-green-800 px-4 py-2 text-lg">
                      ✅ Receipt Confirmed
                    </Badge>
                  )}

                  {delivery.status < 3 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Refresh this specific delivery
                          fetchIncomingDeliveries();
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Update Status
                      </Button>

                      {/* OTP Verification for delivery confirmation */}
                      {delivery.status === 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-100 text-green-700 border-green-300"
                          onClick={() => handleOtpVerification(delivery.pickupId)}
                          disabled={loading}
                        >
                          🔐 Verify OTP & Confirm
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={closeOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔐 OTP Verification
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP to confirm delivery receipt for Pickup #{selectedPickupId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Please enter the 6-digit OTP provided by the delivery agent. The OTP is valid for 5 minutes only.
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    setOtpError("");
                  }}
                  disabled={otpLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {otpError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{otpError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={closeOtpModal}
                disabled={otpLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={verifyOtp}
                disabled={otpLoading || otpValue.length !== 6}
                className="bg-green-600 hover:bg-green-700"
              >
                {otpLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    ✅ Verify & Confirm
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => {
                  // In a real app, this would resend the OTP
                  alert("In a real implementation, this would resend the OTP to your mobile number.");
                }}
              >
                Didn't receive OTP? Resend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}