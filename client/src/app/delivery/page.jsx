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
  TrendingUp,
} from "lucide-react";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import OTPService from "@/lib/services/otpService";

// Contract configuration
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xc0301e242BC846Df68a121bFe7FcE8B52AaA3d4C";

// Polygon Amoy testnet configuration
const POLYGON_AMOY_CONFIG = {
  chainId: "0x13882", // 80002 in hex
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

// ABI helper function
function getMergedABI() {
  try {
    if (
      DiamondMergedABI.abiMap &&
      typeof DiamondMergedABI.abiMap === "object"
    ) {
      const mergedABI = [];
      Object.keys(DiamondMergedABI.abiMap).forEach((contractName) => {
        const abi = DiamondMergedABI.abiMap[contractName];
        if (Array.isArray(abi)) {
          mergedABI.push(...abi);
        }
      });
      return mergedABI;
    }
    return DiamondMergedABI.abi || DiamondMergedABI;
  } catch (error) {
    console.error("Error loading ABI:", error);
    return [];
  }
}

// RPC Provider helper
function getWorkingProvider() {
  const providers = [
    "https://rpc-amoy.polygon.technology/",
    "https://polygon-amoy-bor-rpc.publicnode.com",
    "https://rpc.ankr.com/polygon_amoy",
    "https://polygon-amoy.drpc.org",
  ];

  for (const rpcUrl of providers) {
    try {
      return new ethers.JsonRpcProvider(rpcUrl, {
        name: "polygon-amoy",
        chainId: 80002,
      });
    } catch (error) {
      console.warn(`Provider ${rpcUrl} failed:`, error);
    }
  }

  throw new Error("All RPC providers failed");
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

  // OTP Generation states
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [selectedDeliveryForOtp, setSelectedDeliveryForOtp] = useState(null);
  const [showOtpResult, setShowOtpResult] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [verificationDistance, setVerificationDistance] = useState(null);

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
            console.log(
              "🌐 Connected to network:",
              network.name,
              "Chain ID:",
              network.chainId
            );

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

      // Get delivery agent info using the correct function
      try {
        console.log("📋 Calling getDeliveryAgentDashboard...");
        const agentData = await contractInstance.getDeliveryAgentDashboard(
          agentAddress
        );
        console.log("📋 Raw agent data:", agentData);

        const parsedAgentInfo = {
          agentAddress: agentData.agentAddress || agentData[0] || agentAddress,
          name: agentData.agentName || agentData[1] || "Delivery Agent",
          mobile: agentData.mobile || agentData[2] || "Not Set",
          registrationTime:
            Number(agentData.registrationTime || agentData[3]) || 0,
          assignedShopkeeper:
            agentData.assignedShopkeeper || agentData[4] || ethers.ZeroAddress,
          totalDeliveries:
            Number(agentData.totalDeliveries || agentData[5]) || 0,
          isActive:
            Boolean(
              agentData.isActive !== undefined
                ? agentData.isActive
                : agentData[6]
            ) !== false,
        };

        console.log("✅ Parsed agent info from blockchain:", parsedAgentInfo);
        setAgentInfo(parsedAgentInfo);
      } catch (agentErr) {
        console.warn("⚠️ getDeliveryAgentDashboard failed:", agentErr.message);

        // Fallback: Agent might not be registered
        setAgentInfo({
          agentAddress: agentAddress,
          name: "Unregistered Agent",
          mobile: "Not Registered",
          registrationTime: 0,
          assignedShopkeeper: ethers.ZeroAddress,
          totalDeliveries: 0,
          isActive: false,
        });
      }

      // Get all my pickups from blockchain
      let allPickups = [];
      try {
        console.log("📦 Calling getMyPickups...");
        const pickups = await contractInstance.getMyPickups();
        console.log("📦 Raw pickups data:", pickups);

        if (pickups && Array.isArray(pickups)) {
          allPickups = pickups.map((pickup, index) => ({
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
            pickupLocation:
              pickup.pickupLocation || pickup[10] || "Unknown Location",
            deliveryInstructions:
              pickup.deliveryInstructions || pickup[11] || "",
            isCompleted: Boolean(
              pickup.isCompleted !== undefined ? pickup.isCompleted : pickup[12]
            ),
          }));
        }

        console.log("✅ Parsed all pickups:", allPickups);
        setMyPickups(allPickups);
      } catch (err) {
        console.warn("⚠️ getMyPickups failed:", err.message);
        setMyPickups([]);
      }

      // Get pending pickups using the correct function
      let pendingPickupsData = [];
      try {
        console.log("⏳ Calling getMyPendingPickups...");
        const pendingPickups = await contractInstance.getMyPendingPickups();
        console.log("⏳ Raw pending pickups:", pendingPickups);

        if (pendingPickups && Array.isArray(pendingPickups)) {
          pendingPickupsData = pendingPickups.map((pickup, index) => ({
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
            pickupLocation:
              pickup.pickupLocation || pickup[10] || "Unknown Location",
            deliveryInstructions:
              pickup.deliveryInstructions || pickup[11] || "",
            isCompleted: Boolean(
              pickup.isCompleted !== undefined ? pickup.isCompleted : pickup[12]
            ),
          }));
        }

        console.log("✅ Parsed pending pickups:", pendingPickupsData);
        setPendingPickups(pendingPickupsData);
      } catch (err) {
        console.warn("⚠️ getMyPendingPickups failed:", err.message);
        setPendingPickups([]);
      }

      // Filter pending deliveries from all pickups (status 1 = picked up, ready for delivery)
      const pendingDeliveriesData = allPickups.filter(
        (pickup) => pickup.status === 1 && !pickup.isCompleted
      );

      console.log("🚛 Pending deliveries:", pendingDeliveriesData);
      setPendingDeliveries(pendingDeliveriesData);

      // Calculate statistics
      const stats = {
        totalPickups: allPickups.length,
        pendingPickups: pendingPickupsData.length,
        pendingDeliveries: pendingDeliveriesData.length,
        completedDeliveries: allPickups.filter((p) => p.isCompleted).length,
        totalRationAmount: allPickups.reduce(
          (sum, p) => sum + p.rationAmount,
          0
        ),
      };

      console.log("📊 Statistics:", stats);
      setStatistics(stats);
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
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
          4: "Confirmed",
        };
        throw new Error(
          `Pickup is in ${statusNames[currentStatus]} status, expected ${statusNames[expectedStatus]}`
        );
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
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
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
        gasEstimate = await contractWithSigner.markRationPickedUp.estimateGas(
          BigInt(pickupId)
        );
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        // Use a reasonable default gas limit
        gasEstimate = BigInt(300000);
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.markRationPickedUp(BigInt(pickupId), {
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: ethers.parseUnits("30", "gwei"), // Set reasonable gas price for Polygon
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
        errorMessage =
          "Transaction failed - pickup may already be processed or invalid";
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage =
          "Network error - please check your connection and try again. Make sure you're on Polygon Amoy testnet.";
      } else if (error.code === "UNKNOWN_ERROR") {
        errorMessage =
          "Network or contract error - please try again. Ensure you have MATIC for gas fees.";
      } else if (error.message.includes("nonce")) {
        errorMessage =
          "Transaction nonce error - please reset your MetaMask account or try again";
      } else if (error.message.includes("replacement")) {
        errorMessage =
          "Transaction replacement error - please wait and try again";
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
        throw new Error(
          "markRationDeliveredToShop function not found in contract"
        );
      }

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate =
          await contractWithSigner.markRationDeliveredToShop.estimateGas(
            BigInt(pickupId)
          );
        console.log("⛽ Gas estimate:", gasEstimate.toString());
      } catch (gasError) {
        console.warn("⚠️ Gas estimation failed:", gasError.message);
        // Use a reasonable default gas limit
        gasEstimate = BigInt(300000);
      }

      // Send transaction with proper gas settings
      const tx = await contractWithSigner.markRationDeliveredToShop(
        BigInt(pickupId),
        {
          gasLimit: gasEstimate + BigInt(50000), // Add buffer
          gasPrice: ethers.parseUnits("30", "gwei"), // Set reasonable gas price for Polygon
        }
      );

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
        errorMessage =
          "Transaction failed - delivery may already be processed or invalid";
      } else if (error.message.includes("Internal JSON-RPC error")) {
        errorMessage =
          "Network error - please check your connection and try again. Make sure you're on Polygon Amoy testnet.";
      } else if (error.code === "UNKNOWN_ERROR") {
        errorMessage =
          "Network or contract error - please try again. Ensure you have MATIC for gas fees.";
      } else if (error.message.includes("nonce")) {
        errorMessage =
          "Transaction nonce error - please reset your MetaMask account or try again";
      } else if (error.message.includes("replacement")) {
        errorMessage =
          "Transaction replacement error - please wait and try again";
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
      4: { label: "Confirmed", color: "bg-green-100 text-green-800" },
    };

    const statusInfo = statusMap[status] || {
      label: "Unknown",
      color: "bg-gray-100 text-gray-800",
    };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
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
      if (
        !contract ||
        !shopkeeperAddress ||
        shopkeeperAddress === ethers.ZeroAddress
      ) {
        return "Unknown Shop";
      }

      const shopkeeperInfo = await contract.getShopkeeperInfo(
        shopkeeperAddress
      );
      return (
        shopkeeperInfo.name ||
        shopkeeperInfo[1] ||
        `Shop ${shopkeeperAddress.slice(-4)}`
      );
    } catch (error) {
      return `Shop ${shopkeeperAddress.slice(-4)}`;
    }
  };

  // Location and OTP Functions
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = "Failed to get location: ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage += "Location request timed out";
              break;
            default:
              errorMessage += "Unknown error occurred";
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  const generateDeliveryLocationCoordinates = (pickupLocation) => {
    // For demo purposes, generate mock coordinates based on pickup location
    // In a real scenario, this would come from a database or mapping service
    const locations = {
      "Warehouse A": { latitude: 28.6139, longitude: 77.209 }, // Delhi coordinates
      "Warehouse B": { latitude: 19.076, longitude: 72.8777 }, // Mumbai coordinates
      "Central Depot": { latitude: 12.9716, longitude: 77.5946 }, // Bangalore coordinates
      "Storage Unit 1": { latitude: 22.5726, longitude: 88.3639 }, // Kolkata coordinates
      "Distribution Center": { latitude: 13.0827, longitude: 80.2707 }, // Chennai coordinates
    };

    // Return coordinates for known locations, or default coordinates
    return (
      locations[pickupLocation] || { latitude: 28.6139, longitude: 77.209 }
    );
  };

  const requestOtpGeneration = async (pickup) => {
    try {
      setOtpRequestLoading(true);
      setLocationError("");
      setSelectedDeliveryForOtp(pickup);

      // Step 1: Get user's current location
      setSuccess("Requesting location permission...");
      const currentLocation = await getCurrentLocation();
      setUserLocation(currentLocation);

      // Step 2: Get delivery location coordinates
      const deliveryLocation = generateDeliveryLocationCoordinates(
        pickup.pickupLocation
      );

      // Step 3: Calculate distance between user and delivery location
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude
      );

      console.log("📍 Location verification:");
      console.log("- User location:", currentLocation);
      console.log("- Delivery location:", deliveryLocation);
      console.log("- Distance:", distance, "km");

      // Step 4: Skip distance verification - allow OTP generation from any location
      const maxDistance = 5; // 5 kilometers (kept for display purposes)
      // Commenting out distance check to allow OTP generation from anywhere
      // if (distance > maxDistance) {
      //   throw new Error(`You must be within ${maxDistance}km of the delivery location. Current distance: ${distance.toFixed(2)}km`);
      // }

      // Step 5: Generate OTP (location check bypassed)
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      setGeneratedOtp(otp);
      setShowOtpResult(true);

      setSuccess(
        `Location verified! You are ${distance.toFixed(
          2
        )}km from delivery location. OTP generated successfully.`
      );
    } catch (error) {
      console.error("❌ Error requesting OTP:", error);
      setLocationError(error.message);
      setError(error.message);
    } finally {
      setOtpRequestLoading(false);
    }
  };

  const resetOtpGeneration = () => {
    setGeneratedOtp("");
    setShowOtpResult(false);
    setSelectedDeliveryForOtp(null);
    setUserLocation(null);
    setLocationError("");
    setLocationVerified(false);
    setDeliveryLocation(null);
    setVerificationDistance(null);
  };

  // New separate functions for location verification and OTP generation
  const verifyLocationForDelivery = async (pickup) => {
    try {
      setVerifyingLocation(true);
      setLocationError("");
      setSelectedDeliveryForOtp(pickup);

      // Step 1: Get user's current location
      setSuccess("Requesting location permission...");
      const currentLocation = await getCurrentLocation();
      setUserLocation(currentLocation);

      // Step 2: Get delivery location coordinates
      const deliveryLoc = generateDeliveryLocationCoordinates(
        pickup.pickupLocation
      );
      setDeliveryLocation(deliveryLoc);

      // Step 3: Calculate distance between user and delivery location
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        deliveryLoc.latitude,
        deliveryLoc.longitude
      );

      setVerificationDistance(distance);

      console.log("📍 Location verification:");
      console.log("- User location:", currentLocation);
      console.log("- Delivery location:", deliveryLoc);
      console.log("- Distance:", distance, "km");

      // Step 4: Skip distance verification - allow OTP generation from any location
      const maxDistance = 5; // 5 kilometers (kept for display purposes)
      // Commenting out distance check to allow OTP generation from anywhere
      // if (distance > maxDistance) {
      //   throw new Error(`You must be within ${maxDistance}km of the delivery location. Current distance: ${distance.toFixed(2)}km`);
      // }

      // Location verified successfully (always passes now)
      setLocationVerified(true);
      setSuccess(
        `✅ Location verified! You are ${distance.toFixed(
          2
        )}km from delivery location. You can now generate OTP.`
      );
    } catch (error) {
      console.error("❌ Error verifying location:", error);
      setLocationError(error.message);
      setError(error.message);
      setLocationVerified(false);
    } finally {
      setVerifyingLocation(false);
    }
  };

  const generateOtpForDelivery = async () => {
    if (!locationVerified || !selectedDeliveryForOtp) {
      setError("Please verify your location first before generating OTP");
      return;
    }

    try {
      setOtpRequestLoading(true);

      console.log("🔐 Generating OTP with MongoDB backend...");

      // Generate OTP using the backend service
      const otpResult = await OTPService.generateOTP({
        pickupId: selectedDeliveryForOtp.pickupId.toString(),
        deliveryAgentAddress: account,
        shopkeeperAddress: selectedDeliveryForOtp.shopkeeper,
        deliveryLocation: selectedDeliveryForOtp.pickupLocation,
        rationAmount: selectedDeliveryForOtp.rationAmount,
        category: selectedDeliveryForOtp.category
      });

      if (!otpResult.success) {
        throw new Error(otpResult.error || "Failed to generate OTP");
      }

      // Set the generated OTP and show result
      setGeneratedOtp(otpResult.data.otpCode);
      setShowOtpResult(true);

      setSuccess(
        `🔐 OTP generated successfully for Pickup #${selectedDeliveryForOtp.pickupId}! Valid for 5 minutes.`
      );

      console.log("✅ OTP Generated:", otpResult.data.otpCode);
      console.log("⏰ Expires at:", otpResult.data.expiresAt);
      console.log("🕒 Valid for:", otpResult.data.remainingTime, "seconds");

    } catch (error) {
      console.error("❌ Error generating OTP:", error);
      setError(`Failed to generate OTP: ${error.message}`);
    } finally {
      setOtpRequestLoading(false);
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
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
                    Agent: {agentInfo?.agentAddress?.slice(0, 10)}...
                    {agentInfo?.agentAddress?.slice(-8)}
                  </p>
                  <p className="text-gray-600">
                    Mobile: {agentInfo?.mobile || "Not Set"}
                  </p>
                  {agentInfo?.name?.includes("Agent") &&
                    agentInfo?.mobile === "Not Set" && (
                      <p className="text-amber-600 text-sm mt-1">
                        ⚠️ Agent details not fully loaded - contact admin if
                        this persists
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
                  <Badge
                    variant={agentInfo?.isActive ? "default" : "secondary"}
                    className="bg-green-100 text-green-800"
                  >
                    {agentInfo?.isActive ? "Active Agent" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  📦 Total Pickups: {agentInfo?.totalPickupsAssigned || 0}
                </p>
                <p className="text-sm text-gray-600">
                  🚚 Total Deliveries: {agentInfo?.totalDeliveries || 0}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={refreshDashboard}
                variant="outline"
                disabled={refreshing}
                className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
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
                    const response = await fetch("/api/delivery-agent-info", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ walletAddress: account }),
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
              {(error.includes("Network error") ||
                error.includes("Internal JSON-RPC")) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">
                    🔧 Troubleshooting Steps:
                  </h4>
                  <ol className="text-sm text-red-700 space-y-1">
                    <li>
                      1. Ensure you're connected to{" "}
                      <strong>Polygon Amoy Testnet</strong>
                    </li>
                    <li>2. Check you have MATIC tokens for gas fees</li>
                    <li>3. Try refreshing the page</li>
                    <li>
                      4. Reset MetaMask account (Settings → Advanced → Reset
                      Account)
                    </li>
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
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Pickups
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalPickups}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.completedPickups}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Pickups
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.pendingPickups}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Deliveries
                </CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.pendingDeliveries}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.completionRate}%
                </div>
                <Progress
                  value={parseFloat(statistics.completionRate)}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending-pickups">Pending Pickups</TabsTrigger>
            <TabsTrigger value="pending-deliveries">
              Pending Deliveries
            </TabsTrigger>
            <TabsTrigger value="request-otp">Request OTP</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="">
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
                        <div
                          key={pickup.pickupId}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                #{pickup.pickupId}
                              </Badge>
                              {getStatusBadge(pickup.status)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(pickup.assignedTime)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">
                                Amount:
                              </span>
                              <p className="text-gray-900">
                                {pickup.rationAmount} kg {pickup.category}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Location:
                              </span>
                              <p className="text-gray-900">
                                {pickup.pickupLocation}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Shop:
                              </span>
                              <p className="text-gray-900">
                                {pickup.shopkeeper?.slice(0, 6)}...
                                {pickup.shopkeeper?.slice(-4)}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Status:
                              </span>
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
                              <span className="font-medium text-blue-800">
                                Instructions:
                              </span>
                              <p className="text-blue-700">
                                {pickup.deliveryInstructions}
                              </p>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                pickup.assignedTime > 0
                                  ? "bg-blue-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            <span className="text-gray-600">Assigned</span>

                            <div
                              className={`w-2 h-2 rounded-full ${
                                pickup.pickedUpTime > 0
                                  ? "bg-yellow-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            <span className="text-gray-600">Picked</span>

                            <div
                              className={`w-2 h-2 rounded-full ${
                                pickup.deliveredTime > 0
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            <span className="text-gray-600">Delivered</span>

                            <div
                              className={`w-2 h-2 rounded-full ${
                                pickup.confirmedTime > 0
                                  ? "bg-green-600"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            <span className="text-gray-600">Confirmed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab("pending-pickups")}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    View Pending Pickups ({statistics?.pendingPickups || 0})
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab("pending-deliveries")}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    View Pending Deliveries (
                    {statistics?.pendingDeliveries || 0})
                  </Button>
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => setActiveTab("request-otp")}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Request OTP Generation ({statistics?.pendingDeliveries || 0}
                    )
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={refreshDashboard}
                  >
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
                      <div
                        key={pickup.pickupId}
                        className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">
                              #{pickup.pickupId}
                            </Badge>
                            {getStatusBadge(pickup.status)}
                            <Badge
                              variant="secondary"
                              className="bg-orange-100 text-orange-800"
                            >
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
                            <span className="font-medium text-gray-700">
                              Amount:
                            </span>
                            <p className="text-gray-900 font-semibold">
                              {pickup.rationAmount} kg
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Category:
                            </span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Pickup Location:
                            </span>
                            <p className="text-gray-900">
                              {pickup.pickupLocation}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Assigned:
                            </span>
                            <p className="text-gray-900">
                              {formatDateTime(pickup.assignedTime)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">
                              Deliver To Shop:
                            </span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 10)}...
                              {pickup.shopkeeper?.slice(-8)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Time Since Assignment:
                            </span>
                            <p className="text-gray-900">
                              {pickup.assignedTime > 0
                                ? Math.floor(
                                    (Date.now() / 1000 - pickup.assignedTime) /
                                      3600
                                  ) + " hours ago"
                                : "Just now"}
                            </p>
                          </div>
                        </div>

                        {pickup.deliveryInstructions && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <div>
                                <span className="font-medium text-yellow-800">
                                  Special Instructions:
                                </span>
                                <p className="text-yellow-700 text-sm mt-1">
                                  {pickup.deliveryInstructions}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Steps */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">
                            📋 Next Steps:
                          </h4>
                          <ol className="text-sm text-blue-700 space-y-1">
                            <li>
                              1. Go to pickup location:{" "}
                              <strong>{pickup.pickupLocation}</strong>
                            </li>
                            <li>
                              2. Collect {pickup.rationAmount} kg of{" "}
                              {pickup.category} ration
                            </li>
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
                      <div
                        key={pickup.pickupId}
                        className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">
                              #{pickup.pickupId}
                            </Badge>
                            {getStatusBadge(pickup.status)}
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800"
                            >
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
                            <span className="font-medium text-gray-700">
                              Amount:
                            </span>
                            <p className="text-gray-900 font-semibold">
                              {pickup.rationAmount} kg
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Category:
                            </span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Picked Up:
                            </span>
                            <p className="text-gray-900">
                              {formatDateTime(pickup.pickedUpTime)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Transit Time:
                            </span>
                            <p className="text-gray-900">
                              {pickup.pickedUpTime > 0
                                ? Math.floor(
                                    (Date.now() / 1000 - pickup.pickedUpTime) /
                                      60
                                  ) + " mins"
                                : "Just picked up"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-700">
                              Delivery Address:
                            </span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 10)}...
                              {pickup.shopkeeper?.slice(-8)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Original Pickup Location:
                            </span>
                            <p className="text-gray-900">
                              {pickup.pickupLocation}
                            </p>
                          </div>
                        </div>

                        {pickup.deliveryInstructions && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-medium text-amber-800">
                                  Delivery Instructions:
                                </span>
                                <p className="text-amber-700 text-sm mt-1">
                                  {pickup.deliveryInstructions}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Delivery Progress */}
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">
                            🎯 Delivery Progress:
                          </h4>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-green-700">
                                Picked Up ✓
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="text-orange-700">
                                In Transit...
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              <span className="text-gray-500">Delivered</span>
                            </div>
                          </div>
                          <p className="text-green-700 text-sm mt-2">
                            📍 Click "Mark Delivered" when you reach the
                            shopkeeper
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Request OTP Generation Tab */}
          <TabsContent value="request-otp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Request OTP Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showOtpResult ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">
                        📍 Location-Based OTP Generation
                      </h3>
                      <p className="text-blue-700 text-sm">
                        Follow these steps: 1) Select a delivery, 2) Verify your
                        location (must be within 5km), 3) Generate OTP.
                      </p>
                    </div>

                    {/* Step 1: Select Delivery */}
                    <div>
                      <h4 className="font-medium mb-4">
                        Step 1: Select a delivery for OTP generation
                      </h4>

                      {pendingDeliveries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>
                            No pending deliveries available for OTP generation
                          </p>
                          <p className="text-sm mt-2">
                            Complete pickups first to generate delivery OTPs
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pendingDeliveries.map((pickup) => (
                            <div
                              key={pickup.pickupId}
                              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                selectedDeliveryForOtp?.pickupId ===
                                pickup.pickupId
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                                  : "bg-gradient-to-r from-orange-50 to-yellow-50 hover:border-orange-300"
                              }`}
                              onClick={() => {
                                setSelectedDeliveryForOtp(pickup);
                                setLocationVerified(false);
                                setUserLocation(null);
                                setLocationError("");
                                setGeneratedOtp("");
                                setShowOtpResult(false);
                              }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-white">
                                    #{pickup.pickupId}
                                  </Badge>
                                  {getStatusBadge(pickup.status)}
                                  {selectedDeliveryForOtp?.pickupId ===
                                  pickup.pickupId ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-100 text-blue-800"
                                    >
                                      ✅ Selected
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-orange-100 text-orange-800"
                                    >
                                      🔐 Available
                                    </Badge>
                                  )}
                                </div>
                                {selectedDeliveryForOtp?.pickupId ===
                                  pickup.pickupId && (
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Amount:
                                  </span>
                                  <p className="text-gray-900 font-semibold">
                                    {pickup.rationAmount} kg
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Category:
                                  </span>
                                  <p className="text-gray-900">
                                    {pickup.category}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Delivery Location:
                                  </span>
                                  <p className="text-gray-900">
                                    {pickup.pickupLocation}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Shop Address:
                                  </span>
                                  <p className="text-gray-900 font-mono text-xs">
                                    {pickup.shopkeeper?.slice(0, 6)}...
                                    {pickup.shopkeeper?.slice(-4)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Verify Location */}
                    {selectedDeliveryForOtp && (
                      <div>
                        <h4 className="font-medium mb-4">
                          Step 2: Verify your location
                        </h4>
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="font-semibold text-purple-800">
                                Location Verification for Pickup #
                                {selectedDeliveryForOtp.pickupId}
                              </h5>
                              <p className="text-sm text-purple-700">
                                You must be within 5km of{" "}
                                {selectedDeliveryForOtp.pickupLocation}
                              </p>
                            </div>
                            <Button
                              onClick={() =>
                                verifyLocationForDelivery(
                                  selectedDeliveryForOtp
                                )
                              }
                              disabled={verifyingLocation || locationVerified}
                              size="sm"
                              className={
                                locationVerified
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-purple-600 hover:bg-purple-700"
                              }
                            >
                              {verifyingLocation ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Verifying...
                                </>
                              ) : locationVerified ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Verified ✅
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Verify Location
                                </>
                              )}
                            </Button>
                          </div>

                          {userLocation && locationVerified && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                              <h6 className="font-medium text-green-800 mb-2">
                                ✅ Location Verified Successfully!
                              </h6>
                              <div className="text-sm text-green-700 space-y-1">
                                <p>
                                  <strong>Your Location:</strong>{" "}
                                  {userLocation.latitude.toFixed(4)},{" "}
                                  {userLocation.longitude.toFixed(4)}
                                </p>
                                <p>
                                  <strong>Distance to delivery:</strong>{" "}
                                  {verificationDistance?.toFixed(2)}km
                                </p>
                                <p>
                                  <strong>Accuracy:</strong> ±
                                  {userLocation.accuracy?.toFixed(0)}m
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <h6 className="font-medium text-purple-800 mb-2">
                              📋 Location Verification Process:
                            </h6>
                            <ol className="text-sm text-purple-700 space-y-1">
                              <li>
                                1. 📍 Browser will request your location
                                permission
                              </li>
                              <li>
                                2. 📏 System will verify you're within 5km of
                                delivery location
                              </li>
                              <li>
                                3. ✅ Location verification status will be shown
                              </li>
                              <li>
                                4. 🔐 Proceed to generate OTP once verified
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Generate OTP */}
                    {selectedDeliveryForOtp && locationVerified && (
                      <div>
                        <h4 className="font-medium mb-4">
                          Step 3: Generate OTP
                        </h4>
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="font-semibold text-green-800">
                                Ready to Generate OTP
                              </h5>
                              <p className="text-sm text-green-700">
                                Location verified! You can now generate your
                                delivery OTP.
                              </p>
                            </div>
                            <Button
                              onClick={generateOtpForDelivery}
                              disabled={otpRequestLoading}
                              size="lg"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {otpRequestLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>🔐 Generate OTP</>
                              )}
                            </Button>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <h6 className="font-medium text-green-800 mb-2">
                              📱 What happens after OTP generation:
                            </h6>
                            <ul className="text-sm text-green-700 space-y-1">
                              <li>• You'll receive a 6-digit OTP code</li>
                              <li>• Share this OTP with the shopkeeper</li>
                              <li>
                                • Shopkeeper will use it to confirm delivery
                                receipt
                              </li>
                              <li>• Delivery will be marked as complete</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // OTP Generation Result
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-green-800 mb-2">
                        🎉 OTP Generated Successfully!
                      </h3>
                      <p className="text-green-700 mb-4">
                        Location verified and OTP has been generated for your
                        delivery.
                      </p>

                      <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Your OTP for Pickup #
                          {selectedDeliveryForOtp?.pickupId}:
                        </p>
                        <div className="text-4xl font-bold text-green-600 tracking-wider mb-2">
                          {generatedOtp}
                        </div>
                        <p className="text-xs text-gray-500">
                          Valid for this delivery only
                        </p>
                      </div>

                      {userLocation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <h4 className="font-medium text-blue-800 mb-2">
                            📍 Location Verification Details:
                          </h4>
                          <div className="text-sm text-blue-700 space-y-1">
                            <p>
                              <strong>Your Location:</strong>{" "}
                              {userLocation.latitude.toFixed(4)},{" "}
                              {userLocation.longitude.toFixed(4)}
                            </p>
                            <p>
                              <strong>Distance to delivery:</strong>{" "}
                              {verificationDistance?.toFixed(2)}km
                            </p>
                            <p>
                              <strong>Delivery Location:</strong>{" "}
                              {selectedDeliveryForOtp?.pickupLocation}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <h4 className="font-medium text-yellow-800 mb-2">
                          📋 Next Steps:
                        </h4>
                        <ol className="text-sm text-yellow-700 space-y-1 text-left">
                          <li>1. 🚚 Complete the delivery to the shopkeeper</li>
                          <li>
                            2. 🔐 Provide this OTP to the shopkeeper for
                            verification
                          </li>
                          <li>
                            3. ✅ Shopkeeper will use this OTP to confirm
                            receipt
                          </li>
                          <li>
                            4. 📝 Delivery will be marked as complete once
                            confirmed
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedOtp);
                          setSuccess("OTP copied to clipboard!");
                          setTimeout(() => setSuccess(""), 3000);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        📋 Copy OTP
                      </Button>
                      <Button
                        onClick={resetOtpGeneration}
                        variant="outline"
                        size="sm"
                      >
                        🔄 Generate Another OTP
                      </Button>
                      <Button
                        onClick={() => markDeliveredToShop(pickup.pickupId)}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loading ? "Processing..." : "Mark Delivered"}
                      </Button>
                    </div>
                  </div>
                )}

                {locationError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {locationError}
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-medium text-red-800 mb-2">
                          🔧 Troubleshooting:
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          <li>• Enable location permissions in your browser</li>
                          <li>
                            • Make sure you're physically near the delivery
                            location
                          </li>
                          <li>• Check if GPS is enabled on your device</li>
                          <li>
                            • Try refreshing the page and allowing location
                            access
                          </li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
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
                      <div
                        key={pickup.pickupId}
                        className={`border rounded-lg p-4 ${
                          pickup.isCompleted
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white">
                              #{pickup.pickupId}
                            </Badge>
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
                            <span className="font-medium text-gray-700">
                              Amount:
                            </span>
                            <p className="text-gray-900">
                              {pickup.rationAmount} kg
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Category:
                            </span>
                            <p className="text-gray-900">{pickup.category}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Location:
                            </span>
                            <p className="text-gray-900">
                              {pickup.pickupLocation}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Shop:
                            </span>
                            <p className="text-gray-900 font-mono text-xs">
                              {pickup.shopkeeper?.slice(0, 6)}...
                              {pickup.shopkeeper?.slice(-4)}
                            </p>
                          </div>
                        </div>

                        {/* Timeline for completed deliveries */}
                        {pickup.isCompleted && (
                          <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                            <h4 className="font-medium text-green-800 mb-2">
                              📅 Delivery Timeline:
                            </h4>
                            <div className="space-y-2 text-sm">
                              {pickup.assignedTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-gray-600">
                                    Assigned:{" "}
                                    {formatDateTime(pickup.assignedTime)}
                                  </span>
                                </div>
                              )}
                              {pickup.pickedUpTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-gray-600">
                                    Picked Up:{" "}
                                    {formatDateTime(pickup.pickedUpTime)}
                                  </span>
                                </div>
                              )}
                              {pickup.deliveredTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-gray-600">
                                    Delivered:{" "}
                                    {formatDateTime(pickup.deliveredTime)}
                                  </span>
                                </div>
                              )}
                              {pickup.confirmedTime > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  <span className="text-gray-600">
                                    Confirmed:{" "}
                                    {formatDateTime(pickup.confirmedTime)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Calculate delivery time */}
                            {pickup.assignedTime > 0 &&
                              pickup.deliveredTime > 0 && (
                                <div className="mt-2 text-sm text-green-700">
                                  ⏱️ Total delivery time:{" "}
                                  {Math.floor(
                                    (pickup.deliveredTime -
                                      pickup.assignedTime) /
                                      60
                                  )}{" "}
                                  minutes
                                </div>
                              )}
                          </div>
                        )}

                        {pickup.deliveryInstructions && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Instructions:</span>{" "}
                            {pickup.deliveryInstructions}
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
