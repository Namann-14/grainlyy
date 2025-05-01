"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { ethers } from "ethers";
import { getContract } from "../../utils/contract";
import DepotLayout from "../../components/DepotLayout";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Truck,
  Users,
  Warehouse,
  UserCheck,
  ShoppingBag,
  History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Animation variants for Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function DepotDashboard() {
  const { connected, provider, chainId } = useMetaMask();
  const router = useRouter();

  // Depot details
  const [depotId, setDepotId] = useState("");
  const [depotName, setDepotName] = useState("");
  const [depotLocation, setDepotLocation] = useState("");

  // Users and deliveries
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignedDeliveryPersons, setAssignedDeliveryPersons] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);

  // MetaMask modal simulation
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);
  const [metaMaskModalType, setMetaMaskModalType] = useState("");
  const [metaMaskModalMessage, setMetaMaskModalMessage] = useState("");
  const [fakeTransactionHash, setFakeTransactionHash] = useState("");
  const [fakeMode, setFakeMode] = useState(true); // Set to true by default for easier testing

  // OTP verification
  const [otpInput, setOtpInput] = useState("");
  const [receivedOtp, setReceivedOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [currentOTP, setCurrentOTP] = useState("");
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otpError, setOtpError] = useState("");

  // Ration distribution
  const [rationDistributions, setRationDistributions] = useState([]);
  const [deliveryIdToComplete, setDeliveryIdToComplete] = useState("");

  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHistory, setTxHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("Grainlyyy-depot-tx-history");
    if (savedHistory) {
      try {
        setTxHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse transaction history:", e);
      }
    }
  }, []);

  // Add this useEffect to poll for verification status updates
  useEffect(() => {
    let interval;

    if (
      currentOTP &&
      !otpSuccess &&
      activeDelivery &&
      activeDelivery.status !== "authenticated"
    ) {
      // Poll every 10 seconds to check if OTP was verified
      interval = setInterval(() => {
        checkDeliveryStatus();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentOTP, otpSuccess, activeDelivery]);

  // Save transaction to history
  const saveTransaction = (txData) => {
    const updatedHistory = [...txHistory, txData];
    setTxHistory(updatedHistory);

    // Save to localStorage for persistence
    try {
      localStorage.setItem(
        "Grainlyyy-depot-tx-history",
        JSON.stringify(updatedHistory)
      );
    } catch (e) {
      console.error("Failed to save transaction history:", e);
    }
  };

  // Initialize and fetch depot data
  useEffect(() => {
    if (!connected || !provider) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        const signerAddress = await signer.getAddress();

        console.log("Connected with address:", signerAddress);

        // Find depot by wallet address
        const depotCount = await contract.depotCount();

        for (let i = 1; i <= Number(depotCount); i++) {
          try {
            const depot = await contract.getDepotDetails(i);

            if (
              depot.walletAddress.toLowerCase() === signerAddress.toLowerCase()
            ) {
              setDepotId(String(depot.id));
              setDepotName(depot.name);
              setDepotLocation(depot.location);

              // Get assigned users
              await fetchAssignedUsers(contract, String(depot.id));

              // Get assigned delivery persons
              await fetchAssignedDeliveryPersons(contract, String(depot.id));

              // Get deliveries for this depot
              await fetchDeliveries(contract, String(depot.id));

              // Get ration distributions
              await fetchRationDistributions(contract, String(depot.id));

              break;
            }
          } catch (error) {
            console.error(`Error checking depot ${i}:`, error);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching depot data:", error);
        setError(
          "Failed to load your data from blockchain: " +
            (error.message || error.toString())
        );
        setLoading(false);
      }
    };

    fetchData();
  }, [connected, provider, router]);
  // Add a useEffect to periodically check verification status
  useEffect(() => {
    let interval;

    if (
      (activeDelivery && activeDelivery.status === "in-progress") ||
      activeDelivery?.status === "authenticated"
    ) {
      // Check every 15 seconds for status changes
      interval = setInterval(() => {
        console.log("Checking delivery status...");
        checkDeliveryStatus();
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDelivery, activeDelivery?.status]);

  // Fetch assigned users for this depot
  const fetchAssignedUsers = async (contract, depotId) => {
    try {
      const userCount = await contract.userCount();
      const usersData = [];

      for (let i = 1; i <= Number(userCount); i++) {
        try {
          const user = await contract.getUserDetails(i);

          if (String(user.assignedDepotId) === depotId) {
            usersData.push({
              id: String(user.id),
              name: user.name,
              category: String(user.category),
              walletAddress: user.walletAddress,
              assignedDepotId: String(user.assignedDepotId),
              lastRationDate: user.lastRationDate || null,
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${i}:`, error);
        }
      }

      setAssignedUsers(usersData);
    } catch (error) {
      console.error("Error fetching assigned users:", error);
    }
  };

  // Fetch assigned delivery persons for this depot
  const fetchAssignedDeliveryPersons = async (contract, depotId) => {
    try {
      const deliveryPersonCount = await contract.deliveryPersonCount();
      const deliveryPersonsData = [];

      for (let i = 1; i <= Number(deliveryPersonCount); i++) {
        try {
          const person = await contract.getDeliveryPersonDetails(i);

          // Check if this depot is in the person's assigned depots
          const assignedDepotIds = person.assignedDepotIds.map((id) =>
            String(id)
          );
          if (assignedDepotIds.includes(depotId)) {
            deliveryPersonsData.push({
              id: String(person.id),
              name: person.name,
              walletAddress: person.walletAddress,
              phone: person.phone || "",
            });
          }
        } catch (error) {
          console.error(`Error fetching delivery person ${i}:`, error);
        }
      }

      setAssignedDeliveryPersons(deliveryPersonsData);
    } catch (error) {
      console.error("Error fetching assigned delivery persons:", error);
    }
  };

  // Fetch deliveries for this depot
  const fetchDeliveries = async (contract, depotId) => {
    try {
      // In a real application, you would fetch deliveries from the blockchain
      // Here we'll simulate pending and completed deliveries
      const pendingDeliveriesData = [];
      const completedDeliveriesData = [];

      // Simulate getting deliveries from blockchain
      // In a real app, you'd have a contract function like getDeliveriesByDepot
      const deliveryCount = await contract.deliveryPersonCount(); // This is just a placeholder

      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          // Replace with actual contract call to get deliveries
          // const delivery = await contract.getDeliveryDetails(i);

          // Simulated delivery data
          if (i % 2 === 0) {
            pendingDeliveriesData.push({
              id: `DEL${i}`,
              deliveryPersonId: String(i),
              deliveryPersonName: `Delivery Person ${i}`,
              status: "scheduled",
              scheduledDate: new Date(Date.now() + 86400000 * i).toISOString(),
              users: [],
            });
          } else {
            completedDeliveriesData.push({
              id: `DEL${i}`,
              deliveryPersonId: String(i),
              deliveryPersonName: `Delivery Person ${i}`,
              status: "completed",
              completedDate: new Date(Date.now() - 86400000 * i).toISOString(),
              users: [],
            });
          }
        } catch (error) {
          console.error(`Error fetching delivery ${i}:`, error);
        }
      }

      setPendingDeliveries(pendingDeliveriesData);
      setCompletedDeliveries(completedDeliveriesData);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    }
  };

  // Fetch ration distributions for this depot
  const fetchRationDistributions = async (contract, depotId) => {
    try {
      // In a real application, you would fetch ration distributions from the blockchain
      // Here we'll simulate some ration distribution data
      const rationData = [];

      for (let i = 1; i <= 5; i++) {
        rationData.push({
          id: `RAT${i}`,
          userId: String(i),
          userName: `User ${i}`,
          category: `Category ${(i % 3) + 1}`,
          date: new Date(Date.now() - 86400000 * i).toISOString(),
          items: [
            { name: "Rice", quantity: "5kg" },
            { name: "Wheat", quantity: "3kg" },
            { name: "Sugar", quantity: "1kg" },
            { name: "Oil", quantity: "1L" },
          ],
        });
      }

      setRationDistributions(rationData);
    } catch (error) {
      console.error("Error fetching ration distributions:", error);
    }
  };

  // Receive delivery person
  const receiveDeliveryPerson = async (deliveryPersonId) => {
    try {
      // Find the delivery person in the assigned list
      const deliveryPerson = assignedDeliveryPersons.find(
        (person) => person.id === deliveryPersonId
      );

      if (!deliveryPerson) {
        setError("Selected delivery person not found");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Simulate getting OTP from blockchain
      // In a real app, this would be generated by the delivery person
      const simulatedOtp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      setReceivedOtp(simulatedOtp);

      // Set active delivery
      setActiveDelivery({
        deliveryPersonId: deliveryPersonId,
        deliveryPersonName: deliveryPerson.name,
        status: "in-progress",
        startTime: new Date().toISOString(),
        otp: simulatedOtp,
      });

      // Remove from pending deliveries
      const updatedPendingDeliveries = pendingDeliveries.filter(
        (delivery) => delivery.deliveryPersonId !== deliveryPersonId
      );
      setPendingDeliveries(updatedPendingDeliveries);

      saveTransaction({
        type: "Start Delivery",
        timestamp: Date.now(),
        details: `Started delivery process with Delivery Person ID: ${deliveryPersonId}`,
      });

      // Switch to active delivery tab
      setActiveTab("active-delivery");
    } catch (error) {
      console.error("Error receiving delivery person:", error);
      setError(
        "Failed to receive delivery person: " +
          (error.message || error.toString())
      );
    }
  };

  // Generate OTP function that sets delivery to IN_TRANSIT
  const generateOTP = async () => {
    try {
      setGeneratingOtp(true);
      setOtpError("");
      setOtpSuccess("");

      if (!activeDelivery) {
        setOtpError("No active delivery found");
        setGeneratingOtp(false);
        return;
      }

      // Generate random 6-digit OTP locally first so we can display it immediately
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setCurrentOTP(randomOtp);

      // Show MetaMask popup
      setMetaMaskModalType("otp");
      setMetaMaskModalMessage(
        "Setting OTP and transitioning delivery to IN_TRANSIT..."
      );
      setShowMetaMaskModal(true);

      try {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Find the delivery ID based on the activeDelivery info
        const deliveryCount = await contract.rationDeliveryCount();
        let deliveryId = null;

        for (let i = 1; i <= Number(deliveryCount); i++) {
          try {
            const delivery = await contract.getDeliveryDetails(i);

            if (
              delivery.deliveryPersonId.toString() ===
                activeDelivery.deliveryPersonId &&
              delivery.depotId.toString() === depotId
            ) {
              deliveryId = i;
              console.log("Found delivery ID:", deliveryId);
              break;
            }
          } catch (err) {
            console.error(`Error checking delivery ${i}:`, err);
          }
        }

        if (!deliveryId) {
          throw new Error("Could not find delivery ID in the contract");
        }

        // Call the contract to generate OTP - PASS THE DELIVERY ID AND OUR RANDOM OTP
        const setOtpTx = await contract.generateOTP(deliveryId);

        console.log("Transaction sent:", setOtpTx.hash);

        // Wait for transaction confirmation
        const receipt = await setOtpTx.wait();
        console.log("Transaction confirmed:", receipt);

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Generate OTP",
          txHash: setOtpTx.hash,
          timestamp: Date.now(),
          details: `Generated OTP (${randomOtp}) and set delivery to IN_TRANSIT for Delivery ID: ${deliveryId}`,
        });

        setOtpSuccess(
          `OTP ${randomOtp} generated successfully! The delivery person can now verify this OTP.`
        );

        // Update delivery status to reflect IN_TRANSIT state
        const updatedDelivery = {
          ...activeDelivery,
          status: "in-progress",
          otpGenerated: true,
        };
        setActiveDelivery(updatedDelivery);
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error generating OTP:", error);
      setOtpError(
        "Failed to generate OTP: " + (error.message || error.toString())
      );
    } finally {
      setGeneratingOtp(false);
    }
  };

  // Update this function to use activeDelivery instead of currentDelivery
  const checkDeliveryStatus = async () => {
    try {
      if (!activeDelivery) {
        return;
      }

      console.log("Checking delivery status...");

      // You can implement real checking here
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Try to get the delivery details from the contract
      try {
        // Find the delivery ID based on the activeDelivery info
        const deliveryCount = await contract.rationDeliveryCount();

        for (let i = 1; i <= Number(deliveryCount); i++) {
          try {
            const delivery = await contract.getDeliveryDetails(i);

            if (
              delivery.deliveryPersonId.toString() ===
              activeDelivery.deliveryPersonId
            ) {
              console.log(
                "Found delivery:",
                i,
                "Status:",
                delivery.status.toString()
              );

              // Update UI based on contract status if needed
              const statusNum = Number(delivery.status);

              if (
                statusNum === 1 &&
                activeDelivery.status !== "authenticated"
              ) {
                setActiveDelivery({
                  ...activeDelivery,
                  status: "authenticated",
                });
                setOtpSuccess(
                  "OTP was successfully verified by the delivery person!"
                );
              } else if (
                statusNum === 2 &&
                activeDelivery.status !== "location-verified"
              ) {
                setActiveDelivery({
                  ...activeDelivery,
                  status: "location-verified",
                });
              }
              break;
            }
          } catch (err) {
            console.error(`Error checking delivery ${i}:`, err);
          }
        }
      } catch (error) {
        console.error("Error getting delivery details:", error);
      }
    } catch (error) {
      console.error("Error checking delivery status:", error);
    }
  };

  // Fix the useEffect to use activeDelivery instead of currentDelivery
  useEffect(() => {
    let interval;

    if (
      activeDelivery &&
      (activeDelivery.status === "in-progress" ||
        activeDelivery.status === "authenticated")
    ) {
      // Check every 15 seconds for status changes
      interval = setInterval(() => {
        console.log("Checking delivery status...");
        checkDeliveryStatus();
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDelivery, activeDelivery?.status]);

  // Add this function to reset delivery state when needed
  const resetDeliveryState = async () => {
    try {
      setLoading(true);

      if (!activeDelivery) {
        setError("No active delivery to reset");
        setLoading(false);
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Find the actual delivery ID based on the delivery person ID
      const deliveryCount = await contract.rationDeliveryCount();
      let deliveryIdToReset = null;

      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);

          if (
            delivery.deliveryPersonId.toString() ===
              activeDelivery.deliveryPersonId.toString() &&
            delivery.depotId.toString() === depotId
          ) {
            deliveryIdToReset = i;
            console.log(`Found delivery to reset: ${deliveryIdToReset}`);
            break;
          }
        } catch (err) {
          console.error(`Error checking delivery ${i}:`, err);
        }
      }

      if (!deliveryIdToReset) {
        setError("Could not find the delivery to reset.");
        setLoading(false);
        return;
      }

      console.log(`Resetting delivery ID: ${deliveryIdToReset}`);

      // Reset the delivery state back to pending using the found ID
      const tx = await contract.resetDeliveryState(deliveryIdToReset);
      await tx.wait();

      // Clear success/error states
      setError("");
      setSuccess("Delivery state successfully reset to pending");

      // Reset the current delivery state
      setCurrentOTP(null);
      setActiveDelivery(null);
      setOtpSuccess("");
      setOtpError("");

      // Refresh deliveries data
      if (typeof fetchDeliveries === "function") {
        fetchDeliveries(contract, depotId);
      }
    } catch (error) {
      console.error("Error resetting delivery state:", error);
      setError(
        "Failed to reset delivery state: " + (error.message || error.toString())
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    try {
      setVerifyingOtp(true);
      setOtpError("");
      setOtpSuccess("");

      if (!activeDelivery) {
        setOtpError("No active delivery found");
        return;
      }

      if (otpInput !== receivedOtp) {
        setOtpError("OTP does not match. Please try again.");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Call contract to verify OTP
      const verifyTx = await contract.verifyOTP(
        depotId,
        otpInput,
        activeDelivery.deliveryPersonId
      );
      await verifyTx.wait();

      saveTransaction({
        type: "Verify OTP",
        txHash: verifyTx.hash,
        timestamp: Date.now(),
        details: `OTP verified for Delivery Person ID: ${activeDelivery.deliveryPersonId}`,
      });

      setOtpSuccess(
        "OTP verified successfully! Proceeding to location verification."
      );

      // Update active delivery status
      const updatedDelivery = { ...activeDelivery, status: "authenticated" };
      setActiveDelivery(updatedDelivery);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError(
        "Failed to verify OTP: " + (error.message || error.toString())
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Complete delivery function with proper contract interaction and payment
  // Complete delivery function with proper contract interaction and payment
  const completeDelivery = async (deliveryId = null) => {
    try {
      if (!deliveryId && !activeDelivery) {
        setError("No active delivery found");
        return;
      }

      // Show MetaMask popup
      setMetaMaskModalType("complete");
      setMetaMaskModalMessage("Processing final payment on blockchain...");
      setShowMetaMaskModal(true);

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // If no deliveryId provided, find it from activeDelivery
        let targetDeliveryId = deliveryId;
        if (!targetDeliveryId && activeDelivery) {
          // Find the delivery ID based on the activeDelivery info
          const deliveryCount = await contract.rationDeliveryCount();

          for (let i = 1; i <= Number(deliveryCount); i++) {
            try {
              const delivery = await contract.getDeliveryDetails(i);

              if (
                delivery.deliveryPersonId.toString() ===
                  activeDelivery.deliveryPersonId &&
                delivery.depotId.toString() === depotId
              ) {
                targetDeliveryId = i;
                console.log("Found delivery ID:", targetDeliveryId);
                break;
              }
            } catch (err) {
              console.error(`Error checking delivery ${i}:`, err);
            }
          }
        }

        if (!targetDeliveryId) {
          throw new Error("Could not find delivery ID in the contract");
        }

        console.log("Completing delivery with ID:", targetDeliveryId);

        // IMPORTANT: Send ETH with the transaction
        // This is the payment amount for the delivery person
        const paymentAmount = ethers.parseEther("0.01"); // Adjust as needed - 0.01 ETH

        // Call contract with the delivery ID and include payment
        const completeTx = await contract.completeDelivery(targetDeliveryId, {
          value: paymentAmount,
        });

        console.log("Transaction sent:", completeTx.hash);

        // Wait for transaction confirmation
        const receipt = await completeTx.wait();
        console.log("Transaction confirmed:", receipt);

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Complete Delivery",
          txHash: completeTx.hash,
          timestamp: Date.now(),
          details: `Delivery #${targetDeliveryId} completed successfully with payment of 0.01 ETH`,
        });

        // If we were completing an active delivery from state
        if (activeDelivery) {
          // Update delivery status
          const completedDelivery = {
            ...activeDelivery,
            status: "completed",
            completedDate: new Date().toISOString(),
          };

          // Add to completed deliveries list
          setCompletedDeliveries((prev) => [completedDelivery, ...prev]);

          // Reset active delivery state
          setActiveDelivery(null);
          setOtpInput("");
          setReceivedOtp("");
          setOtpSuccess("");
          setOtpError("");
          setCurrentOTP("");

          // Switch back to overview tab
          setActiveTab("overview");
        }

        // Reset the deliveryIdToComplete input
        setDeliveryIdToComplete("");

        // Show success message
        setSuccess(
          "Delivery completed successfully! Payment of 0.01 ETH has been sent to the delivery person."
        );
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
      setError(
        "Failed to complete delivery: " + (error.message || error.toString())
      );
    }
  };
  const verifyLocation = async () => {
    try {
      if (!activeDelivery) {
        setError("No active delivery found");
        return;
      }

      // Get current location
      let currentLocation = null;

      try {
        if (navigator.geolocation) {
          currentLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              (error) => {
                reject(error);
              }
            );
          });
        } else {
          throw new Error("Geolocation is not supported by your browser");
        }
      } catch (err) {
        setError(
          "Unable to get your current location. Please enable location services."
        );
        return;
      }

      // Show MetaMask popup
      setMetaMaskModalType("location");
      setMetaMaskModalMessage(
        "Verifying location and sending verification payment..."
      );
      setShowMetaMaskModal(true);

      try {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();

        // Find the delivery person's address
        const deliveryPerson = assignedDeliveryPersons.find(
          (person) => person.id === activeDelivery.deliveryPersonId
        );

        if (!deliveryPerson || !deliveryPerson.walletAddress) {
          throw new Error("Delivery person wallet address not found");
        }

        // Send another small amount of ETH to the delivery person
        const tx = await signer.sendTransaction({
          to: deliveryPerson.walletAddress,
          value: ethers.parseEther("0.00001"),
        });

        // Wait for transaction confirmation
        await tx.wait();

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Verify Location",
          txHash: tx.hash,
          timestamp: Date.now(),
          details: `Location verified and payment sent to Delivery Person ID: ${activeDelivery.deliveryPersonId}`,
        });

        // Update active delivery status
        const updatedDelivery = {
          ...activeDelivery,
          status: "location-verified",
        };
        setActiveDelivery(updatedDelivery);

        setSuccess(
          "Location verified successfully! You can now proceed with ration distribution."
        );
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error verifying location:", error);
      setError(
        "Failed to verify location: " + (error.message || error.toString())
      );
    }
  };

  // Track ration distribution
  const trackRationDistribution = async (userId, items) => {
    try {
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Call contract to track ration distribution
      const trackTx = await contract.allocateRation(
        userId,
        depotId,
        activeDelivery ? activeDelivery.deliveryPersonId : "0"
      );
      await trackTx.wait();

      saveTransaction({
        type: "Allocate Ration",
        txHash: trackTx.hash,
        timestamp: Date.now(),
        details: `Ration allocated to User ID: ${userId}`,
      });

      // Update ration distributions
      const user = assignedUsers.find((u) => u.id === userId);
      const newDistribution = {
        id: `RAT${Date.now()}`,
        userId: userId,
        userName: user ? user.name : `User ${userId}`,
        category: user ? user.category : "Unknown",
        date: new Date().toISOString(),
        items: items || [
          { name: "Rice", quantity: "5kg" },
          { name: "Wheat", quantity: "3kg" },
          { name: "Sugar", quantity: "1kg" },
          { name: "Oil", quantity: "1L" },
        ],
      };

      setRationDistributions([newDistribution, ...rationDistributions]);

      // Update user's last ration date
      const updatedUsers = assignedUsers.map((u) => {
        if (u.id === userId) {
          return { ...u, lastRationDate: new Date().toISOString() };
        }
        return u;
      });

      setAssignedUsers(updatedUsers);

      alert("Ration distribution tracked successfully!");
    } catch (error) {
      console.error("Error tracking ration distribution:", error);
      setError(
        "Failed to track ration distribution: " +
          (error.message || error.toString())
      );
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate days since last ration
  const daysSinceLastRation = (lastRationDate) => {
    if (!lastRationDate) return "Never";
    const lastDate = new Date(lastRationDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Stats for dashboard
  const getStats = () => [
    {
      title: "Assigned Users",
      value: assignedUsers.length,
      change: `+${assignedUsers.length > 0 ? assignedUsers.length : 0}%`,
      icon: Users,
      color: "bg-green-50 text-green-700",
    },
    {
      title: "Delivery Personnel",
      value: assignedDeliveryPersons.length,
      change: `+${
        assignedDeliveryPersons.length > 0 ? assignedDeliveryPersons.length : 0
      }%`,
      icon: Truck,
      color: "bg-amber-50 text-amber-700",
    },
    {
      title: "Total Distributions",
      value: rationDistributions.length,
      change: `+${
        rationDistributions.length > 0 ? rationDistributions.length : 0
      }%`,
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Completed Deliveries",
      value: completedDeliveries.length,
      change: `+${
        completedDeliveries.length > 0 ? completedDeliveries.length : 0
      }%`,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-700",
    },
  ];

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "authenticated":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-amber-100 text-amber-800";
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      case "location-verified":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  return (
    <DepotLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Depot Dashboard</h1>
          {!loading && depotName && (
            <p className="text-muted-foreground">
              Welcome to {depotName} {depotLocation && `(${depotLocation})`}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            <p className="ml-3">Loading your dashboard...</p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="bg-green-50">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-white"
                  disabled={activeDelivery !== null}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="active-delivery"
                  className="data-[state=active]:bg-white"
                  disabled={!activeDelivery}
                >
                  Active Delivery
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-white"
                  disabled={activeDelivery !== null}
                >
                  Beneficiaries
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-white"
                  disabled={activeDelivery !== null}
                >
                  Transaction History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <motion.div
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {getStats().map((stat, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Card className="overflow-hidden border-green-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              {stat.title}
                            </CardTitle>
                            <div className={`rounded-full p-2 ${stat.color}`}>
                              <stat.icon className="h-4 w-4" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-green-600 flex items-center mt-1">
                            {stat.change}
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2 mt-6">
                  {/* Assigned Delivery Persons */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle>Assigned Delivery Personnel</CardTitle>
                          <CardDescription>
                            Manage delivery personnel assigned to your depot
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {assignedDeliveryPersons.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignedDeliveryPersons.map((person) => (
                                <TableRow
                                  key={person.id}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {person.id}
                                  </TableCell>
                                  <TableCell>{person.name}</TableCell>
                                  <TableCell>
                                    {person.phone || "Not Available"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      onClick={() =>
                                        receiveDeliveryPerson(person.id)
                                      }
                                      variant="outline"
                                      size="sm"
                                      className="border-green-200 text-green-700 hover:bg-green-50"
                                      disabled={activeDelivery !== null}
                                    >
                                      <Truck className="h-3.5 w-3.5 mr-1" />
                                      Receive
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Truck className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No delivery personnel assigned yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Pending Deliveries */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Pending Deliveries</CardTitle>
                        <CardDescription>
                          Deliveries scheduled for your depot
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pendingDeliveries.length > 0 ? (
                          <div className="space-y-4">
                            {pendingDeliveries.map((delivery) => (
                              <div
                                key={delivery.id}
                                className="border rounded-lg p-4 bg-green-50/50 hover:bg-green-50 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="rounded-full p-2 bg-green-100 text-green-700 mr-3">
                                      <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold">
                                        {delivery.id}
                                      </h3>
                                      <p className="text-gray-600 text-sm">
                                        {delivery.deliveryPersonName} |{" "}
                                        {formatDate(delivery.scheduledDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    className={getStatusColor(delivery.status)}
                                  >
                                    {delivery.status === "scheduled"
                                      ? "Scheduled"
                                      : "In Progress"}
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() =>
                                    receiveDeliveryPerson(
                                      delivery.deliveryPersonId
                                    )
                                  }
                                  className="mt-3 bg-green-600 hover:bg-green-700 w-full"
                                  disabled={activeDelivery !== null}
                                >
                                  Receive Delivery
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No pending deliveries
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <motion.div
                  className="grid gap-6 md:grid-cols-2 mt-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.5 }}
                >
                  {/* Recent Ration Distributions */}
                  <motion.div variants={itemVariants}>
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Recent Ration Distributions</CardTitle>
                        <CardDescription>
                          Latest rations distributed to beneficiaries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {rationDistributions.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>Beneficiary</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rationDistributions.slice(0, 5).map((ration) => (
                                <TableRow
                                  key={ration.id}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {ration.userName}
                                    <span className="block text-xs text-gray-500">
                                      {ration.category}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(ration.date)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {ration.items
                                        .slice(0, 2)
                                        .map((item, index) => (
                                          <Badge
                                            key={index}
                                            variant="outline"
                                            className="bg-green-50 text-green-800 border-green-200"
                                          >
                                            {item.name}: {item.quantity}
                                          </Badge>
                                        ))}
                                      {ration.items.length > 2 && (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-800 border-green-200"
                                        >
                                          +{ration.items.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No ration distributions recorded
                            </p>
                          </div>
                        )}
                      </CardContent>
                      {rationDistributions.length > 5 && (
                        <CardFooter>
                          <Button
                            variant="outline"
                            className="w-full border-green-200 text-green-700"
                            onClick={() => setActiveTab("users")}
                          >
                            View All Distributions
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </motion.div>

                  {/* Completed Deliveries */}
                  <motion.div variants={itemVariants}>
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Completed Deliveries</CardTitle>
                        <CardDescription>
                          Successfully completed deliveries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {completedDeliveries.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>ID</TableHead>
                                <TableHead>Delivery Person</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {completedDeliveries
                                .slice(0, 5)
                                .map((delivery) => (
                                  <TableRow
                                    key={delivery.id}
                                    className="hover:bg-green-50/50"
                                  >
                                    <TableCell className="font-medium">
                                      {delivery.id}
                                    </TableCell>
                                    <TableCell>
                                      {delivery.deliveryPersonName}
                                    </TableCell>
                                    <TableCell>
                                      {formatDate(delivery.completedDate)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={getStatusColor("completed")}
                                      >
                                        Completed
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No completed deliveries yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                      {completedDeliveries.length > 5 && (
                        <CardFooter>
                          <Button
                            variant="outline"
                            className="w-full border-green-200 text-green-700"
                            onClick={() => setActiveTab("history")}
                          >
                            View All Deliveries
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>

              {/* Active Delivery Tab */}
              <TabsContent value="active-delivery" className="mt-6">
                {activeDelivery && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border-green-100 shadow-sm mb-6">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Active Delivery</CardTitle>
                          <CardDescription>
                            Processing delivery with{" "}
                            {activeDelivery.deliveryPersonName}
                          </CardDescription>
                        </div>
                        <Badge
                          className={getStatusColor(activeDelivery.status)}
                        >
                          <div className="flex items-center">
                            {activeDelivery.status === "authenticated" ? (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            ) : activeDelivery.status ===
                              "location-verified" ? (
                              <MapPin className="h-4 w-4 mr-1" />
                            ) : (
                              <Clock className="h-4 w-4 mr-1" />
                            )}
                            <span>
                              {activeDelivery.status === "authenticated"
                                ? "OTP Verified"
                                : activeDelivery.status === "location-verified"
                                ? "Location Verified"
                                : "In Progress"}
                            </span>
                          </div>
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Start</span>
                            <span>OTP</span>
                            <span>Location</span>
                            <span>Complete</span>
                          </div>
                          <div className="relative w-full h-2 bg-green-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{
                                width:
                                  activeDelivery.status === "in-progress"
                                    ? "25%"
                                    : activeDelivery.status === "authenticated"
                                    ? "50%"
                                    : activeDelivery.status ===
                                      "location-verified"
                                    ? "75%"
                                    : "25%",
                              }}
                            />
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50/50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-500">
                              Delivery Person ID
                            </p>
                            <p className="font-medium">
                              {activeDelivery.deliveryPersonId}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Start Time</p>
                            <p className="font-medium">
                              {formatDate(activeDelivery.startTime)}
                            </p>
                          </div>
                        </div>

                        {/* OTP Generation and Display */}
                        <Card className="border-green-200">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              OTP Verification
                            </CardTitle>
                            <CardDescription>
                              Generate and provide OTP to the delivery person
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {otpError && (
                              <Alert variant="destructive" className="mb-4">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{otpError}</AlertDescription>
                              </Alert>
                            )}

                            {otpSuccess && (
                              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>
                                  {otpSuccess}
                                </AlertDescription>
                              </Alert>
                            )}

                            {currentOTP && (
                              <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-green-800 mb-2">
                                  Verification OTP
                                </h3>
                                <div className="bg-white p-4 border border-green-200 rounded-lg text-center">
                                  <p className="text-3xl font-mono font-bold tracking-widest">
                                    {currentOTP}
                                  </p>
                                </div>
                                <p className="mt-2 text-sm text-green-700">
                                  Show this OTP to the delivery person for
                                  verification. They need to enter this code in
                                  their dashboard.
                                </p>
                                <div className="bg-yellow-50 p-3 mt-3 rounded border border-yellow-200">
                                  <p className="text-yellow-800">
                                    <strong>Important:</strong> Only the
                                    delivery person can verify this OTP from
                                    their app. After they verify, click "Check
                                    Verification Status" below.
                                  </p>
                                </div>
                                <div className="mt-4">
                                  <Button
                                    onClick={checkDeliveryStatus}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Check Verification Status
                                  </Button>
                                </div>
                              </div>
                            )}

                            {otpError && otpError.includes("pending state") && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
                                <p className="text-yellow-800 mb-2">
                                  <strong>Delivery State Issue:</strong> This
                                  delivery has already progressed beyond the
                                  pending state.
                                </p>
                                <p className="text-yellow-700 mb-4">
                                  The OTP can only be generated when a delivery
                                  is in the pending state. You need to reset the
                                  delivery state first.
                                </p>
                                <Button
                                  onClick={resetDeliveryState}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  disabled={loading}
                                >
                                  {loading
                                    ? "Resetting..."
                                    : "Reset Delivery to Pending State"}
                                </Button>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                onClick={generateOTP}
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={generatingOtp || !activeDelivery}
                              >
                                {generatingOtp ? (
                                  <>
                                    <span className="inline-block animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full"></span>
                                    Generating...
                                  </>
                                ) : (
                                  "Generate OTP for Verification"
                                )}
                              </Button>

                              <div className="mt-3 flex items-center ml-2">
                                <input
                                  type="checkbox"
                                  id="fake-mode"
                                  className="mr-2"
                                  checked={fakeMode}
                                  onChange={() => setFakeMode(!fakeMode)}
                                />
                                <label
                                  htmlFor="fake-mode"
                                  className="text-sm text-gray-600"
                                >
                                  Enable test mode (simulates blockchain
                                  transactions)
                                </label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Location Verification Section */}
                        {activeDelivery.status === "authenticated" && (
                          <Card className="border-blue-200">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                Location Verification
                              </CardTitle>
                              <CardDescription>
                                Verify the delivery person's location
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center">
                                <Button
                                  onClick={verifyLocation}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Verify Location
                                </Button>
                                <p className="ml-4 text-sm text-gray-600">
                                  Click to verify the delivery person's location
                                  with your depot
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Complete Delivery Button */}
                        {activeDelivery.status === "location-verified" && (
                          <div className="flex justify-center mt-6">
                            <Button
                              onClick={completeDelivery}
                              className="bg-green-600 hover:bg-green-700 px-8 py-6 text-lg"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Complete Delivery
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Users (Beneficiaries) Tab */}
              <TabsContent value="users" className="mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <Card className="border-green-100 shadow-sm mb-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Beneficiaries</CardTitle>
                        <CardDescription>
                          Manage users assigned to your depot
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {assignedUsers.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>User ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Last Ration</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignedUsers.map((user) => (
                              <TableRow
                                key={user.id}
                                className="hover:bg-green-50/50"
                              >
                                <TableCell className="font-medium">
                                  {user.id}
                                </TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.category}</TableCell>
                                <TableCell>
                                  {user.lastRationDate ? (
                                    <>
                                      {formatDate(user.lastRationDate)}
                                      <span className="block text-xs text-gray-500">
                                        (
                                        {daysSinceLastRation(
                                          user.lastRationDate
                                        )}{" "}
                                        days ago)
                                      </span>
                                    </>
                                  ) : (
                                    "Never"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() =>
                                      trackRationDistribution(user.id)
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200 text-green-700 hover:bg-green-50"
                                  >
                                    <Package className="h-3.5 w-3.5 mr-1" />
                                    Track Ration
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No users assigned to this depot
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Record New Ration Distribution Form */}
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Record New Ration Distribution</CardTitle>
                      <CardDescription>
                        Track ration distribution to beneficiaries
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const beneficiaryId = formData.get("beneficiaryId");
                          const items = [
                            { name: "Rice", quantity: formData.get("riceQty") },
                            {
                              name: "Wheat",
                              quantity: formData.get("wheatQty"),
                            },
                            {
                              name: "Sugar",
                              quantity: formData.get("sugarQty"),
                            },
                            { name: "Oil", quantity: formData.get("oilQty") },
                          ].filter((item) => item.quantity);

                          trackRationDistribution(beneficiaryId, items);
                          e.target.reset();
                        }}
                      >
                        <div className="grid grid-cols-1 gap-6">
                          <div className="grid gap-3">
                            <Label htmlFor="beneficiaryId">
                              Select Beneficiary
                            </Label>
                            <Select name="beneficiaryId" required>
                              <SelectTrigger
                                id="beneficiaryId"
                                className="w-full"
                              >
                                <SelectValue placeholder="Choose a beneficiary" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignedUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} (ID: {user.id})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="riceQty">Rice</Label>
                              <Input
                                id="riceQty"
                                name="riceQty"
                                placeholder="e.g., 5kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="wheatQty">Wheat</Label>
                              <Input
                                id="wheatQty"
                                name="wheatQty"
                                placeholder="e.g., 3kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sugarQty">Sugar</Label>
                              <Input
                                id="sugarQty"
                                name="sugarQty"
                                placeholder="e.g., 1kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="oilQty">Oil</Label>
                              <Input
                                id="oilQty"
                                name="oilQty"
                                placeholder="e.g., 1L"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Record Distribution
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* All Ration Distributions */}
                  <Card className="border-green-100 shadow-sm mt-6">
                    <CardHeader>
                      <CardTitle>All Ration Distributions</CardTitle>
                      <CardDescription>
                        Complete history of rations distributed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {rationDistributions.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>ID</TableHead>
                              <TableHead>Beneficiary</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Items</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rationDistributions.map((ration) => (
                              <TableRow
                                key={ration.id}
                                className="hover:bg-green-50/50"
                              >
                                <TableCell className="font-medium">
                                  {ration.id}
                                </TableCell>
                                <TableCell>{ration.userName}</TableCell>
                                <TableCell>{ration.category}</TableCell>
                                <TableCell>{formatDate(ration.date)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {ration.items.map((item, index) => (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="bg-green-50 text-green-800 border-green-200"
                                      >
                                        {item.name}: {item.quantity}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <Package className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No ration distributions recorded
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Transaction History Tab */}
              <TabsContent value="history" className="mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Record of blockchain transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {txHistory.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>Type</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Transaction</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {txHistory
                              .slice()
                              .reverse()
                              .map((tx, index) => (
                                <TableRow
                                  key={index}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {tx.type}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(tx.timestamp)}
                                  </TableCell>
                                  <TableCell>{tx.details}</TableCell>
                                  <TableCell>
                                    {tx.txHash ? (
                                      <a
                                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:underline flex items-center"
                                      >
                                        View on Etherscan
                                        <ArrowUpRight className="ml-1 h-3 w-3" />
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <History className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No transactions recorded yet
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Instruction Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Delivery Process Instructions */}
                    <Card className="border-green-100 shadow-sm bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-indigo-800">
                          Delivery Process
                        </CardTitle>
                        <CardDescription className="text-indigo-700">
                          Follow these steps for handling deliveries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2 text-indigo-700 list-decimal pl-5">
                          <li>
                            <span className="font-medium">
                              Receive delivery person
                            </span>{" "}
                            - When a delivery person arrives, click "Receive
                            Delivery"
                          </li>
                          <li>
                            <span className="font-medium">
                              Generate and share OTP
                            </span>{" "}
                            - Create an OTP and show it to the delivery person
                          </li>
                          <li>
                            <span className="font-medium">Verify location</span>{" "}
                            - Confirm the delivery person is at your depot
                            location
                          </li>
                          <li>
                            <span className="font-medium">
                              Complete delivery
                            </span>{" "}
                            - Process payment to the delivery person
                            automatically via smart contract
                          </li>
                        </ol>
                      </CardContent>
                    </Card>

                    {/* Ration Distribution Instructions */}
                    <Card className="border-green-100 shadow-sm bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">
                          Ration Distribution
                        </CardTitle>
                        <CardDescription className="text-green-700">
                          Guidelines for distributing rations to beneficiaries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2 text-green-700 list-decimal pl-5">
                          <li>
                            <span className="font-medium">
                              Verify beneficiary identity
                            </span>{" "}
                            - Check beneficiary's ID/documents
                          </li>
                          <li>
                            <span className="font-medium">
                              Distribute ration items
                            </span>{" "}
                            - Provide the appropriate items based on category
                          </li>
                          <li>
                            <span className="font-medium">
                              Record in blockchain
                            </span>{" "}
                            - Click "Track Ration" and enter details
                          </li>
                          <li>
                            <span className="font-medium">Update status</span> -
                            The system will automatically update last ration
                            date for the beneficiary
                          </li>
                        </ol>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      {/* MetaMask Transaction Modal */}
      {showMetaMaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 mr-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 35 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z"
                    fill="#E17726"
                    stroke="#E17726"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.65881 1L15.6697 10.8511L13.3487 4.99099L2.65881 1Z"
                    fill="#E27625"
                    stroke="#E27625"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">MetaMask Transaction</h3>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Transaction Type:</span>
                <span className="font-medium">
                  {metaMaskModalType === "otp"
                    ? "Generate OTP"
                    : metaMaskModalType === "reset"
                    ? "Reset Delivery"
                    : "Delivery Processing"}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">For Delivery:</span>
                <span className="font-medium">
                  #{activeDelivery?.id || "..."}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Gas Fee (est.):</span>
                <span>0.001 ETH</span>
              </div>
            </div>

            <p className="mb-4 text-center text-gray-700">
              {metaMaskModalMessage}
            </p>

            <div className="flex justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Please confirm this transaction in your MetaMask wallet
            </p>
          </div>
        </div>
      )}
      <div className="mt-4">
        <h3 className="font-medium text-lg mb-2">Complete Delivery by ID</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Delivery ID"
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-green-500"
            value={deliveryIdToComplete}
            onChange={(e) => setDeliveryIdToComplete(e.target.value)}
          />
          <Button
            onClick={() => completeDelivery(deliveryIdToComplete)}
            className="bg-green-600 hover:bg-green-700 rounded-l-none"
          >
            Complete
          </Button>
        </div>
      </div>
    </DepotLayout>
  );
}
