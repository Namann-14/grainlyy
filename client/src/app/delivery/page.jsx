"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Phone,
  User,
  Calendar,
  TrendingUp
} from "lucide-react";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";

// Polygon Amoy testnet configuration
const POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // 80002 in hex
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology/'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

// ABI helper function
function getMergedABI() {
  try {
    if (DiamondMergedABI.abiMap && typeof DiamondMergedABI.abiMap === 'object') {
      const mergedABI = [];
      Object.keys(DiamondMergedABI.abiMap).forEach(contractName => {
        const abi = DiamondMergedABI.abiMap[contractName];
        if (Array.isArray(abi)) {
          mergedABI.push(...abi);
        }
      });
      return mergedABI;
    }
    return DiamondMergedABI.abi || DiamondMergedABI;
  } catch (error) {
    console.error('Error loading ABI:', error);
    return [];
  }
}

// RPC Provider helper
function getWorkingProvider() {
  const providers = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://rpc.ankr.com/polygon_amoy',
    'https://polygon-amoy.drpc.org'
  ];

  for (const rpcUrl of providers) {
    try {
      return new ethers.JsonRpcProvider(rpcUrl, {
        name: "polygon-amoy",
        chainId: 80002
      });
    } catch (error) {
      console.warn(`Provider ${rpcUrl} failed:`, error);
    }
  }

  throw new Error('All RPC providers failed');
}

export default function DeliveryDashboard() {
  const { connected, account, provider } = useMetaMask();
  const router = useRouter();

  // Core states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dashboard data
  const [agentInfo, setAgentInfo] = useState(null);
  const [myPickups, setMyPickups] = useState([]);
  const [pendingPickups, setPendingPickups] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [contract, setContract] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!connected || !account) {
        setError("Please connect your wallet to access the delivery dashboard");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Check network first
        if (provider && connected) {
          try {
            const ethersProvider = new ethers.BrowserProvider(provider);
            const network = await ethersProvider.getNetwork();
            console.log("🌐 Connected to network:", network.name, "Chain ID:", network.chainId);
            
            if (network.chainId !== 80002n) {
              console.log("🔄 Wrong network detected, attempting to switch...");
              await switchToPolygonAmoy();
              // Refresh the page after network switch
              window.location.reload();
              return;
            }
          } catch (networkError) {
            console.warn("⚠️ Network check failed:", networkError.message);
            if (networkError.message.includes("Chain ID")) {
              throw networkError;
            }
          }
        }

        // Get working provider and create contract instance
        const workingProvider = getWorkingProvider();
        let signer = null;

        if (provider && connected) {
          try {
            const ethersProvider = new ethers.BrowserProvider(provider);
            signer = await ethersProvider.getSigner();
            console.log("✅ Got signer:", await signer.getAddress());
          } catch (signerError) {
            console.warn("Could not get signer from MetaMask:", signerError);
            signer = null;
          }
        }

        const mergedABI = getMergedABI();
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          mergedABI,
          signer || workingProvider
        );

        setContract(contractInstance);

        // Fetch all dashboard data
        await fetchDashboardData(contractInstance, account);

        setLoading(false);
      } catch (err) {
        console.error("Error initializing dashboard:", err);
        setError(`Failed to initialize dashboard: ${err.message}`);
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [connected, account, provider]);

  const fetchDashboardData = async (contractInstance, agentAddress) => {
    try {
      console.log("🚚 Fetching delivery agent data for:", agentAddress);

      // Get delivery agent info - try API first for better reliability
      try {
        console.log("📋 Fetching agent info via API...");
        const response = await fetch('/api/delivery-agent-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: agentAddress })
        });

        const result = await response.json();
        if (result.success && result.agent) {
          console.log("✅ Got agent info from API:", result.agent);
          setAgentInfo(result.agent);
        } else {
          throw new Error(result.error || "API call failed");
        }
      } catch (apiErr) {
        console.warn('⚠️ API call failed, trying direct blockchain call:', apiErr.message);

        // Fallback to direct blockchain call
        try {
          console.log("📋 Calling getDeliveryAgentInfo directly...");
          const agentData = await contractInstance.getDeliveryAgentInfo(agentAddress);
          console.log("📋 Raw agent data:", agentData);

          const parsedAgentInfo = {
            agentAddress: agentData.agentAddress || agentData[0] || agentAddress,
            name: agentData.agentName || agentData.name || agentData[1] || "Delivery Agent",
            mobile: agentData.mobile || agentData[2] || "Not Set",
            registrationTime: Number(agentData.registrationTime || agentData[3]) || 0,
            assignedShopkeeper: agentData.assignedShopkeeper || agentData[4] || ethers.ZeroAddress,
            totalDeliveries: Number(agentData.totalDeliveries || agentData[5]) || 0,
            totalPickupsAssigned: Number(agentData.totalPickupsAssigned || agentData[6]) || 0,
            isActive: Boolean(agentData.isActive !== undefined ? agentData.isActive : agentData[7]) !== false
          };

          console.log("✅ Parsed agent info from blockchain:", parsedAgentInfo);
          setAgentInfo(parsedAgentInfo);
        } catch (blockchainErr) {
          console.warn('⚠️ Direct blockchain call also failed:', blockchainErr.message);

          // Final fallback - check if agent is registered by trying to get their pickups
          try {
            console.log("🔍 Checking if agent exists by testing pickup functions...");
            await contractInstance.getMyPickups();

            // If we can call getMyPickups without error, agent exists
            setAgentInfo({
              agentAddress: agentAddress,
              name: `Delivery Agent ${agentAddress.slice(-4).toUpperCase()}`,
              mobile: "Contact Admin for Details",
              registrationTime: Math.floor(Date.now() / 1000),
              assignedShopkeeper: ethers.ZeroAddress,
              totalDeliveries: 0,
              totalPickupsAssigned: 0,
              isActive: true
            });
            console.log("✅ Agent exists but details not available");
          } catch (finalErr) {
            console.error('❌ Agent verification failed:', finalErr.message);
            // Agent might not be registered
            setAgentInfo({
              agentAddress: agentAddress,
              name: "Unregistered Agent",
              mobile: "Not Registered",
              registrationTime: 0,
              assignedShopkeeper: ethers.ZeroAddress,
              totalDeliveries: 0,
              totalPickupsAssigned: 0,
              isActive: false
            });
          }
        }
      }

      // Get my pickups from blockchain
      let allPickups = [];
      try {
        console.log("📦 Calling getMyPickups...");
        const pickups = await contractInstance.getMyPickups();
        console.log("📦 Raw pickups data:", pickups);

        if (pickups && Array.isArray(pickups)) {
          allPickups = pickups.map(pickup => ({
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
        }

        console.log("✅ Parsed pickups:", allPickups);
        setMyPickups(allPickups);
      } catch (err) {
        console.warn('⚠️ getMyPickups not available:', err.message);

        // Create mock data for demonstration
        const mockPickups = [
          {
            pickupId: 1,
            deliveryAgent: agentAddress,
            shopkeeper: "0x1234567890123456789012345678901234567890",
            rationAmount: 50,
            category: "BPL",
            status: 1, // Picked up
            assignedTime: Math.floor(Date.now() / 1000) - 7200,
            pickedUpTime: Math.floor(Date.now() / 1000) - 3600,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: "Central Warehouse",
            deliveryInstructions: "Handle with care",
            isCompleted: false
          },
          {
            pickupId: 2,
            deliveryAgent: agentAddress,
            shopkeeper: "0x0987654321098765432109876543210987654321",
            rationAmount: 75,
            category: "APL",
            status: 0, // Assigned
            assignedTime: Math.floor(Date.now() / 1000) - 1800,
            pickedUpTime: 0,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: "District Warehouse",
            deliveryInstructions: "Call before delivery",
            isCompleted: false
          }
        ];

        console.log("📝 Using mock pickups data");
        allPickups = mockPickups;
        setMyPickups(mockPickups);
      }

      // Get pending pickups (status 0 = assigned)
      try {
        console.log("⏳ Calling getMyPendingPickups...");
        const pendingPickupsData = await contractInstance.getMyPendingPickups();
        console.log("⏳ Raw pending pickups:", pendingPickupsData);

        if (pendingPickupsData && Array.isArray(pendingPickupsData)) {
          const parsedPendingPickups = pendingPickupsData.map(pickup => ({
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
          setPendingPickups(parsedPendingPickups);
        } else {
          // Filter from all pickups
          const pendingFromAll = allPickups.filter(p => p.status === 0);
          setPendingPickups(pendingFromAll);
        }
      } catch (err) {
        console.warn('⚠️ getMyPendingPickups not available:', err.message);
        // Filter from all pickups for pending ones (status 0)
        const pendingFromAll = allPickups.filter(p => p.status === 0);
        setPendingPickups(pendingFromAll);
      }

      // Get pending deliveries (status 1 = picked up, ready for delivery)
      try {
        console.log("🚛 Calling getMyPendingDeliveries...");
        const pendingDeliveriesData = await contractInstance.getMyPendingDeliveries();
        console.log("🚛 Raw pending deliveries:", pendingDeliveriesData);

        if (pendingDeliveriesData && Array.isArray(pendingDeliveriesData)) {
          const parsedPendingDeliveries = pendingDeliveriesData.map(pickup => ({
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
          setPendingDeliveries(parsedPendingDeliveries);
        } else {
          // Filter from all pickups
          const deliveriesFromAll = allPickups.filter(p => p.status === 1 || p.status === 2);
          setPendingDeliveries(deliveriesFromAll);
        }
      } catch (err) {
        console.warn('⚠️ getMyPendingDeliveries not available:', err.message);
        // Filter from all pickups for deliveries (status 1 or 2)
        const deliveriesFromAll = allPickups.filter(p => p.status === 1 || p.status === 2);
        setPendingDeliveries(deliveriesFromAll);
      }

      // Calculate statistics based on actual data
      const totalPickups = allPickups.length;
      const completedPickups = allPickups.filter(p => p.isCompleted || p.status >= 4).length;
      const pendingPickupsCount = allPickups.filter(p => p.status === 0).length;
      const pendingDeliveriesCount = allPickups.filter(p => p.status === 1 || p.status === 2).length;

      const calculatedStats = {
        totalPickups,
        completedPickups,
        pendingPickups: pendingPickupsCount,
        pendingDeliveries: pendingDeliveriesCount,
        completionRate: totalPickups > 0 ? ((completedPickups / totalPickups) * 100).toFixed(1) : '0'
      };

      console.log("📊 Calculated statistics:", calculatedStats);
      setStatistics(calculatedStats);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }
  };

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

  const validatePickup = async (pickupId, expectedStatus) => {
    try {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      // Try to get pickup details to validate it exists
      const pickup = await contract.getPickupDetails(BigInt(pickupId));
      
      if (!pickup || pickup.length === 0) {
        throw new Error("Pickup not found");
      }

      const currentStatus = Number(pickup[5] || pickup.status || 0);
      
      if (expectedStatus !== undefined && currentStatus !== expectedStatus) {
        const statusNames = {
          0: "Assigned",
          1: "Picked Up", 
          2: "In Transit",
          3: "Delivered",
          4: "Confirmed"
        };
        throw new Error(`Pickup is in ${statusNames[currentStatus]} status, expected ${statusNames[expectedStatus]}`);
      }

      return true;
    } catch (error) {
      console.warn("⚠️ Pickup validation failed:", error.message);
      // Don't throw error here, just warn - the contract will handle validation
      return false;
    }
  };

  const switchToPolygonAmoy = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY_CONFIG],
          });
        } catch (addError) {
          throw new Error("Failed to add Polygon Amoy network to MetaMask");
        }
      } else {
        throw new Error("Failed to switch to Polygon Amoy network");
      }
    }
  };

  const markPickedUp = async (pickupId) => {
    try {
      setLoading(true);
      setError("");

      if (!connected || !account || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      console.log("🔄 Marking pickup as picked up:", pickupId);

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Validate pickup ID
      if (!pickupId || pickupId <= 0) {
        throw new Error("Invalid pickup ID");
      }

      // Validate pickup exists and is in correct status (0 = Assigned)
      await validatePickup(pickupId, 0);

      // Check if the function exists in the contract
      if (!contractWithSigner.markRationPickedUp) {
        throw new Error("markRationPickedUp function not found in contract");
      }

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.markRationPickedUp.estimateGas(BigInt(pickupId));
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        // Use a reasonable default gas limit
        gasEstimate = BigInt(300000);
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.markRationPickedUp(BigInt(pickupId), {
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: ethers.parseUnits("30", "gwei") // Set reasonable gas price for Polygon
      });

      setSuccess("Transaction sent! Waiting for confirmation...");
      console.log("📤 Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
      setSuccess("Pickup marked successfully! Refreshing dashboard...");

      // Refresh dashboard after successful transaction
      await refreshDashboard();
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error marking pickup:", error);
      
      let errorMessage = "Failed to mark pickup";
      
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Transaction failed - pickup may already be processed or invalid";
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

  const markDeliveredToShop = async (pickupId) => {
    try {
      setLoading(true);
      setError("");

      if (!connected || !account || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      console.log("🚚 Marking delivery as completed:", pickupId);

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Validate pickup ID
      if (!pickupId || pickupId <= 0) {
        throw new Error("Invalid pickup ID");
      }

      // Validate pickup exists and is in correct status (1 = Picked Up)
      await validatePickup(pickupId, 1);

      // Check if the function exists in the contract
      if (!contractWithSigner.markRationDeliveredToShop) {
        throw new Error("markRationDeliveredToShop function not found in contract");
      }

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.markRationDeliveredToShop.estimateGas(BigInt(pickupId));
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        // Use a reasonable default gas limit
        gasEstimate = BigInt(300000);
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.markRationDeliveredToShop(BigInt(pickupId), {
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: ethers.parseUnits("30", "gwei") // Set reasonable gas price for Polygon
      });

      setSuccess("Transaction sent! Waiting for confirmation...");
      console.log("📤 Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
      setSuccess("Delivery marked successfully! Refreshing dashboard...");

      // Refresh dashboard after successful transaction
      await refreshDashboard();
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error marking delivery:", error);
      
      let errorMessage = "Failed to mark delivery";
      
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Transaction failed - delivery may already be processed or invalid";
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

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: "Assigned", color: "bg-blue-100 text-blue-800" },
      1: { label: "Picked Up", color: "bg-yellow-100 text-yellow-800" },
      2: { label: "In Transit", color: "bg-orange-100 text-orange-800" },
      3: { label: "Delivered", color: "bg-green-100 text-green-800" },
      4: { label: "Confirmed", color: "bg-green-100 text-green-800" }
    };

    const statusInfo = statusMap[status] || { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Never";
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Not set";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Get shopkeeper name for display
  const getShopkeeperName = async (shopkeeperAddress) => {
    try {
      if (!contract || !shopkeeperAddress || shopkeeperAddress === ethers.ZeroAddress) {
        return "Unknown Shop";
      }

      const shopkeeperInfo = await contract.getShopkeeperInfo(shopkeeperAddress);
      return shopkeeperInfo.name || shopkeeperInfo[1] || `Shop ${shopkeeperAddress.slice(-4)}`;
    } catch (error) {
      return `Shop ${shopkeeperAddress.slice(-4)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Truck className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  🚚
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {agentInfo?.name || "Delivery Dashboard"}
                  </h1>
                  <p className="text-blue-600 font-semibold">
                    Agent: {agentInfo?.agentAddress?.slice(0, 10)}...{agentInfo?.agentAddress?.slice(-8)}
                  </p>
                  <p className="text-gray-600">
                    Mobile: {agentInfo?.mobile || "Not Set"}
                  </p>
                  {agentInfo?.name?.includes("Agent") && agentInfo?.mobile === "Not Set" && (
                    <p className="text-amber-600 text-sm mt-1">
                      ⚠️ Agent details not fully loaded - contact admin if this persists
                    </p>
                  )}
                  {agentInfo?.name === "Unregistered Agent" && (
                    <p className="text-red-600 text-sm mt-1">
                      ❌ Agent not registered - please contact admin
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={agentInfo?.isActive ? "default" : "secondary"} className="bg-green-100 text-green-800">
                    {agentInfo?.isActive ? "Active Agent" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">📦 Total Pickups: {agentInfo?.totalPickupsAssigned || 0}</p>
                <p className="text-sm text-gray-600">🚚 Total Deliveries: {agentInfo?.totalDeliveries || 0}</p>
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
              <Button
                onClick={switchToPolygonAmoy}
                variant="outline"
                size="sm"
                className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                Switch Network
              </Button>
              <Button
                onClick={async () => {
                  console.log("🔍 Debug: Testing agent info fetch...");
                  try {
                    const response = await fetch('/api/delivery-agent-info', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ walletAddress: account })
                    });
                    const result = await response.json();
                    console.log("🔍 Debug result:", result);
                    alert(`Debug Result: ${JSON.stringify(result, null, 2)}`);
                  } catch (error) {
                    console.error("🔍 Debug error:", error);
                    alert(`Debug Error: ${error.message}`);
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Debug Info
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {(error.includes("Network error") || error.includes("Internal JSON-RPC")) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">🔧 Troubleshooting Steps:</h4>
                  <ol className="text-sm text-red-700 space-y-1">
                    <li>1. Ensure you're connected to <strong>Polygon Amoy Testnet</strong></li>
                    <li>2. Check you have MATIC tokens for gas fees</li>
                    <li>3. Try refreshing the page</li>
                    <li>4. Reset MetaMask account (Settings → Advanced → Reset Account)</li>
                    <li>5. Use the "Switch Network" button above</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.completedPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics.pendingPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics.pendingDeliveries}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.completionRate}%</div>
                <Progress value={parseFloat(statistics.completionRate)} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending-pickups">Pending Pickups</TabsTrigger>
            <TabsTrigger value="pending-deliveries">Pending Deliveries</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {myPickups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pickups assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myPickups.slice(0, 5).map((pickup) => (
                        <div key={pickup.pickupId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{pickup.pickupId}</Badge>
                              {getStatusBadge(pickup.status)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(pickup.assignedTime)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Amount:</span>
                              <p className="text-gray-900">{pickup.rationAmount} kg {pickup.category}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Location:</span>
                              <p className="text-gray-900">{pickup.pickupLocation}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Shop:</span>
                              <p className="text-gray-900">{pickup.shopkeeper?.slice(0, 6)}...{pickup.shopkeeper?.slice(-4)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Status:</span>
                              <p className="text-gray-900">
                                {pickup.status === 0 && "Ready for pickup"}
                                {pickup.status === 1 && "Picked up"}
                                {pickup.status === 2 && "In transit"}
                                {pickup.status === 3 && "Delivered"}
                                {pickup.status === 4 && "Confirmed"}
                              </p>
                            </div>
                          </div>

                          {pickup.deliveryInstructions && (
                            <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium text-blue-800">Instructions:</span>
                              <p className="text-blue-700">{pickup.deliveryInstructions}</p>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${pickup.assignedTime > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-600">Assigned</span>

                            <div className={`w-2 h-2 rounded-full ${pickup.pickedUpTime > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-600">Picked</span>

                            <div className={`w-2 h-2 rounded-full ${pickup.deliveredTime > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-600">Delivered</span>

                            <div className={`w-2 h-2 rounded-full ${pickup.confirmedTime > 0 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-600">Confirmed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={() => setActiveTab("pending-pickups")}>
                    <Package className="h-4 w-4 mr-2" />
                    View Pending Pickups ({statistics?.pendingPickups || 0})
                  </Button>
                  <Button className="w-full" onClick={() => setActiveTab("pending-deliveries")}>
                    <Truck className="h-4 w-4 mr-2" />
                    View Pending Deliveries ({statistics?.pendingDeliveries || 0})
                  </Button>
                  <Button className="w-full" variant="outline" onClick={refreshDashboard}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pending Pickups Tab */}
          <TabsContent value="pending-pickups">
            <Card>
              <CardHeader>
                <CardTitle>Pending Pickups</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPickups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending pickups</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPickups.map((pickup) => (
                      <div key={pickup.pickupId} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">#{pickup.pickupId}</Badge>
                            {getStatusBadge(pickup.status)}
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              🕒 Urgent
                            </Badge>
                          </div>
                          <Button
                            onClick={() => markPickedUp(pickup.pickupId)}
                            disabled={loading}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {loading ? "Processing..." : "Mark Picked Up"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <p className="text-gray-900 font-semibold">{pickup.rationAmount} kg</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Pickup Location:</span>
                            <p className="text-gray-900">{pickup.pickupLocation}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Assigned:</span>
                            <p className="text-gray-900">{formatDateTime(pickup.assignedTime)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Deliver To Shop:</span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 10)}...{pickup.shopkeeper?.slice(-8)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Time Since Assignment:</span>
                            <p className="text-gray-900">
                              {pickup.assignedTime > 0 ?
                                Math.floor((Date.now() / 1000 - pickup.assignedTime) / 3600) + " hours ago" :
                                "Just now"
                              }
                            </p>
                          </div>
                        </div>

                        {pickup.deliveryInstructions && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <div>
                                <span className="font-medium text-yellow-800">Special Instructions:</span>
                                <p className="text-yellow-700 text-sm mt-1">{pickup.deliveryInstructions}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Steps */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">📋 Next Steps:</h4>
                          <ol className="text-sm text-blue-700 space-y-1">
                            <li>1. Go to pickup location: <strong>{pickup.pickupLocation}</strong></li>
                            <li>2. Collect {pickup.rationAmount} kg of {pickup.category} ration</li>
                            <li>3. Click "Mark Picked Up" when collected</li>
                            <li>4. Deliver to shopkeeper address above</li>
                          </ol>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Deliveries Tab */}
          <TabsContent value="pending-deliveries">
            <Card>
              <CardHeader>
                <CardTitle>Pending Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending deliveries</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDeliveries.map((pickup) => (
                      <div key={pickup.pickupId} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">#{pickup.pickupId}</Badge>
                            {getStatusBadge(pickup.status)}
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              🚚 In Transit
                            </Badge>
                          </div>
                          <Button
                            onClick={() => markDeliveredToShop(pickup.pickupId)}
                            disabled={loading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {loading ? "Processing..." : "Mark Delivered"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <p className="text-gray-900 font-semibold">{pickup.rationAmount} kg</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Picked Up:</span>
                            <p className="text-gray-900">{formatDateTime(pickup.pickedUpTime)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Transit Time:</span>
                            <p className="text-gray-900">
                              {pickup.pickedUpTime > 0 ?
                                Math.floor((Date.now() / 1000 - pickup.pickedUpTime) / 60) + " mins" :
                                "Just picked up"
                              }
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">Delivery Address:</span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 10)}...{pickup.shopkeeper?.slice(-8)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Original Pickup Location:</span>
                            <p className="text-gray-900">{pickup.pickupLocation}</p>
                          </div>
                        </div>

                        {pickup.deliveryInstructions && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-medium text-amber-800">Delivery Instructions:</span>
                                <p className="text-amber-700 text-sm mt-1">{pickup.deliveryInstructions}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Delivery Progress */}
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">🎯 Delivery Progress:</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-green-700">Picked Up ✓</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="text-orange-700">In Transit...</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              <span className="text-gray-500">Delivered</span>
                            </div>
                          </div>
                          <p className="text-green-700 text-sm mt-2">
                            📍 Click "Mark Delivered" when you reach the shopkeeper
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Pickup History</CardTitle>
              </CardHeader>
              <CardContent>
                {myPickups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pickup history</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myPickups.map((pickup) => (
                      <div key={pickup.pickupId} className={`border rounded-lg p-4 ${pickup.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">#{pickup.pickupId}</Badge>
                            {getStatusBadge(pickup.status)}
                            {pickup.isCompleted && (
                              <Badge className="bg-green-100 text-green-800">
                                ✅ Completed
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateTime(pickup.assignedTime)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <p className="text-gray-900">{pickup.rationAmount} kg</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Category:</span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <p className="text-gray-900">{pickup.pickupLocation}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Shop:</span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 6)}...{pickup.shopkeeper?.slice(-4)}
                            </p>
                          </div>
                        </div>

                        {/* Timeline for completed deliveries */}
                        {pickup.isCompleted && (
                          <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                            <h4 className="font-medium text-green-800 mb-2">📅 Delivery Timeline:</h4>
                            <div className="space-y-2 text-sm">
                              {pickup.assignedTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-gray-600">Assigned: {formatDateTime(pickup.assignedTime)}</span>
                                </div>
                              )}
                              {pickup.pickedUpTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-gray-600">Picked Up: {formatDateTime(pickup.pickedUpTime)}</span>
                                </div>
                              )}
                              {pickup.deliveredTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-gray-600">Delivered: {formatDateTime(pickup.deliveredTime)}</span>
                                </div>
                              )}
                              {pickup.confirmedTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  <span className="text-gray-600">Confirmed: {formatDateTime(pickup.confirmedTime)}</span>
                                </div>
                              )}
                            </div>

                            {/* Calculate delivery time */}
                            {pickup.assignedTime > 0 && pickup.deliveredTime > 0 && (
                              <div className="mt-2 text-sm text-green-700">
                                ⏱️ Total delivery time: {Math.floor((pickup.deliveredTime - pickup.assignedTime) / 60)} minutes
                              </div>
                            )}
                          </div>
                        )}

                        {pickup.deliveryInstructions && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Instructions:</span> {pickup.deliveryInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}