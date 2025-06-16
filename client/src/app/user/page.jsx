'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { 
  ArrowUpRight, Users, Package, MessageSquare, HeartHandshake, 
  Loader2, CheckCircle2, Clock, AlertCircle, IndianRupee, Receipt, History
} from "lucide-react"
import contractABI from "@/lib/abi.json"

const CONTRACT_ADDRESS = "0x1c61F82aad05c30190C211c1E28f2dE28f1f8Ab8"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function UserDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [userData, setUserData] = useState(null)
  const [userRations, setUserRations] = useState([])
  const [userDeliveries, setUserDeliveries] = useState([])
  const [activeTab, setActiveTab] = useState("overview")
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("0")
  const [selectedRation, setSelectedRation] = useState(null)
  const [paying, setPaying] = useState(false)
  const [txHistory, setTxHistory] = useState([])
  
  // State for payment notifications
  const [newAllocationNotice, setNewAllocationNotice] = useState(null)
  const [checkingNotifications, setCheckingNotifications] = useState(false)

  // Auth context
  const [provider, setProvider] = useState(null)
  const [userAddress, setUserAddress] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  // Initialize provider and check if user is authenticated
  useEffect(() => {
    const initProvider = async () => {
      try {
        // Check if window is defined (browser environment)
        if (typeof window !== "undefined" && window.ethereum) {
          const ethProvider = window.ethereum;
          
          // Request account access
          const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
          const address = accounts[0];
          setUserAddress(address);
          
          // Create ethers provider
          const provider = new ethers.BrowserProvider(ethProvider);
          setProvider(provider);

          const signer = await provider.getSigner();
          const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
          
          // Debug logs
          console.log("Connected address:", address);
          console.log("Contract address:", CONTRACT_ADDRESS);
          console.log("Current network:", await provider.getNetwork());

          try {
            // Check if user exists - IMPORTANT: using getUserIdByAddress not getDepotIdByAddress
            console.log("Checking if user exists...");
            const userId = await contract.getUserIdByAddress(address);
            console.log("Received userId:", userId, "Type:", typeof userId);
            
            if (userId && Number(userId) > 0) {
              setUserId(Number(userId));
              setIsConnected(true);
              fetchUserData(contract, Number(userId));
            } else {
              setError("You are not registered as a user. Please register first.");
              router.push('/');
            }
          } catch (error) {
            console.error("Error checking user:", error);
            setError("You are not registered as a user. Please register first.");
            router.push('/');
          }
        } else {
          setError("Please install MetaMask to use this application");
        }
      } catch (error) {
        console.error("Error initializing provider:", error);
        setError("Failed to connect wallet. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initProvider();
  }, [router]);

  // Check for new payment notifications
  useEffect(() => {
    if (!userId) return;
    
    const checkForNotifications = () => {
      setCheckingNotifications(true);
      try {
        // Get notifications from localStorage
        const notifications = JSON.parse(localStorage.getItem('rationchain-payment-notifications') || '[]');
        
        // Find unread notifications for this user
        const myNotifications = notifications.filter(n => 
          n.userId == userId && !n.read
        );
        
        // If there are notifications, show the first one
        if (myNotifications.length > 0) {
          setNewAllocationNotice(myNotifications[0]);
          
          // Mark as read
          const updatedNotifications = notifications.map(n => {
            if (n.id === myNotifications[0].id) {
              return { ...n, read: true };
            }
            return n;
          });
          
          // Save back to localStorage
          localStorage.setItem('rationchain-payment-notifications', JSON.stringify(updatedNotifications));
        }
      } catch (error) {
        console.error("Error checking notifications:", error);
      } finally {
        setCheckingNotifications(false);
      }
    };
    
    // Check immediately
    checkForNotifications();
    
    // Set up interval to check regularly
    const interval = setInterval(checkForNotifications, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch user data from blockchain
  const fetchUserData = async (contract, userId) => {
    try {
      setLoading(true);
      
      // Get user details
      const userDetails = await contract.getUserDetails(userId);
      setUserData({
        id: userId,
        name: userDetails.name,
        category: Number(userDetails.category),
        depotId: Number(userDetails.assignedDepotId),
        walletAddress: userDetails.walletAddress,
        lastRationDate: userDetails.lastRationDate ? new Date(Number(userDetails.lastRationDate) * 1000).toISOString() : null
      });
      
      // Get user deliveries
      const deliveries = await contract.getUserDeliveries(userId);
      
      // Process deliveries
// Fix for the date conversion error in the fetchUserData function

// Process deliveries
const processedDeliveries = deliveries.map(delivery => {
  // Add defensive timestamp handling
  let formattedDate;
  try {
    // Ensure timestamp is a valid number and within JavaScript's Date range
    const timestamp = Number(delivery.timestamp);
    if (timestamp && !isNaN(timestamp) && isFinite(timestamp)) {
      const date = new Date(timestamp * 1000);
      // Check if date is valid before calling toISOString()
      if (date instanceof Date && !isNaN(date)) {
        formattedDate = date.toISOString();
      } else {
        formattedDate = new Date().toISOString(); // Fallback to current time
      }
    } else {
      formattedDate = new Date().toISOString(); // Fallback to current time
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    formattedDate = new Date().toISOString(); // Fallback to current time
  }

  return {
    id: String(delivery.id || 0),
    depotId: String(delivery.depotId || 0),
    deliveryPersonId: String(delivery.deliveryPersonId || 0),
    status: delivery.status || "unknown",
    date: formattedDate,
    isPaid: Boolean(delivery.isPaid)
  };
});
      
      setUserDeliveries(processedDeliveries);
      
      // Get depot address for payments
      const depotDetails = await contract.getDepotDetails(Number(userDetails.assignedDepotId));
      const depotAddress = depotDetails.walletAddress;
      
      // Get ration data
      const mockRations = [
        {
          id: `RAT${Date.now()}`,
          depotId: userDetails.assignedDepotId,
          depotName: "Local Depot",
          depotAddress: depotAddress,
          date: new Date().toISOString(),
          status: "allocated",
          isPaid: false,
          amount: "0.01",
          items: [
            { name: "Rice", quantity: "5kg" },
            { name: "Wheat", quantity: "3kg" },
            { name: "Sugar", quantity: "1kg" },
            { name: "Oil", quantity: "1L" }
          ]
        }
      ];
      
      setUserRations(mockRations);
      
      // Transaction history
      const txHistory = JSON.parse(localStorage.getItem(`txHistory-${userId}`) || '[]');
      setTxHistory(txHistory);
      
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking "Pay Now" from notification
  const handlePayNow = (notification) => {
    // Prepare payment data
    const paymentData = {
      id: notification.rationId || notification.id,
      depotId: notification.depotId,
      depotAddress: notification.depotAddress,
      date: notification.date,
      amount: notification.amount,
      items: notification.items,
      isPaid: false
    };
    
    // Close the notification
    setNewAllocationNotice(null);
    
    // Set up payment dialog with data
    setSelectedRation(paymentData);
    setPaymentAmount(notification.amount);
    setPaymentDialog(true);
  };

// FIXED payForRation function that sends payment directly to the depot wallet
const payForRation = async (rationId, amount) => {
  try {
    setPaying(true);
    setPaymentDialog(false);
    
    // Show processing message
    setSuccess("Processing your payment...");
    
    // Get depot's wallet address - THIS IS THE KEY FIX
    // We need to send money directly to a wallet, not to the contract
    let recipientAddress;
    
    try {
      if (selectedRation.depotAddress && ethers.isAddress(selectedRation.depotAddress)) {
        recipientAddress = selectedRation.depotAddress;
      } else {
        // Fallback to fetching depot address if not already available
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        const depotDetails = await contract.getDepotDetails(selectedRation.depotId);
        recipientAddress = depotDetails.walletAddress;
      }
      
      // If still no valid address, show error
      if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
        throw new Error("Could not find a valid depot wallet address for payment");
      }
    } catch (error) {
      throw new Error("Failed to get depot wallet address: " + error.message);
    }
    
    const signer = await provider.getSigner();
    
    // Convert ETH amount to wei
    const paymentAmountWei = ethers.parseEther(amount);
    
    // Send payment directly to depot wallet address - NOT to the contract
    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: paymentAmountWei
    });
    
    setSuccess("Payment transaction submitted! Waiting for confirmation...");
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Update transaction history
    const newTx = {
      type: "Payment",
      timestamp: new Date().toISOString(),
      details: `Paid for ration allocation #${rationId} to depot #${selectedRation.depotId}`,
      txHash: receipt.hash,
      amount: `${amount} ETH`
    };
    
    const updatedHistory = [newTx, ...txHistory];
    setTxHistory(updatedHistory);
    
    // Save to localStorage
    localStorage.setItem(`txHistory-${userId}`, JSON.stringify(updatedHistory));
    
    // Update ration status in local state
    const updatedRations = userRations.map(ration => {
      if (ration.id === rationId) {
        return { ...ration, isPaid: true };
      }
      return ration;
    });
    
    setUserRations(updatedRations);
    setSuccess(`Payment of ${amount} ETH for ration #${rationId} completed successfully!`);
    
  } catch (error) {
    console.error("Error making payment:", error);
    setError("Payment failed: " + error.message);
  } finally {
    setPaying(false);
  }
};

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Mock chart data based on user's category
  const getChartData = () => {
    if (!userData) return [];
    
    // Different allocation patterns based on user category
    switch (userData.category) {
      case 1: // BPL
        return [
          { name: "Jan", rice: 5, wheat: 3, sugar: 1, oil: 1 },
          { name: "Feb", rice: 5, wheat: 3, sugar: 1, oil: 1 },
          { name: "Mar", rice: 6, wheat: 4, sugar: 2, oil: 1 },
          { name: "Apr", rice: 5, wheat: 3, sugar: 1, oil: 1 },
          { name: "May", rice: 7, wheat: 4, sugar: 2, oil: 2 },
        ];
      case 2: // APL
        return [
          { name: "Jan", rice: 3, wheat: 2, sugar: 0.5, oil: 0.5 },
          { name: "Feb", rice: 3, wheat: 2, sugar: 0.5, oil: 0.5 },
          { name: "Mar", rice: 4, wheat: 3, sugar: 1, oil: 0.5 },
          { name: "Apr", rice: 3, wheat: 2, sugar: 0.5, oil: 0.5 },
          { name: "May", rice: 5, wheat: 3, sugar: 1, oil: 1 },
        ];
      default:
        return [
          { name: "Jan", rice: 4, wheat: 2, sugar: 1, oil: 0.5 },
          { name: "Feb", rice: 4, wheat: 2, sugar: 1, oil: 0.5 },
          { name: "Mar", rice: 5, wheat: 3, sugar: 1, oil: 1 },
          { name: "Apr", rice: 4, wheat: 2, sugar: 1, oil: 0.5 },
          { name: "May", rice: 6, wheat: 3, sugar: 2, oil: 1 },
        ];
    }
  };

  // Get stats for dashboard
  const getStats = () => [
    {
      title: "Category",
      value: userData?.category === 1 ? "BPL" : userData?.category === 2 ? "APL" : "General",
      change: "Active",
      icon: Users,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Rations Received",
      value: userRations.filter(r => r.isPaid).length.toString(),
      change: `+${userRations.filter(r => r.isPaid).length > 0 ? 1 : 0}`,
      icon: Package,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Pending Payments",
      value: userRations.filter(r => !r.isPaid).length.toString(),
      change: userRations.filter(r => !r.isPaid).length > 0 ? "Action Required" : "All Clear",
      icon: IndianRupee,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Depot",
      value: userData?.depotId ? `#${userData.depotId}` : "None",
      change: userData?.depotId ? "Assigned" : "Unassigned",
      icon: HeartHandshake,
      color: "bg-green-100 text-green-700",
    },
  ];

  // Payment Notification Component
  const PaymentNotification = ({ notification, onClose, onPay }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 mr-4 bg-green-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="text-lg font-bold">New Ration Allocated!</h3>
          </div>
          
          <div className="border-t border-b border-green-100 py-4 my-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Depot:</span>
              <span className="font-medium">#{notification.depotId}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Amount Due:</span>
              <span className="font-medium text-green-700">{notification.amount} ETH</span>
            </div>
            
            <div className="mt-3">
              <p className="font-medium text-gray-700">Items included:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {notification.items.map((item, index) => (
                  <Badge key={index} className="bg-green-50 text-green-800 border-green-100">
                    {item.name}: {item.quantity}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between gap-4 mt-4">
            <Button 
              variant="outline" 
              className="flex-1 border-green-200"
              onClick={onClose}
            >
              Pay Later
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onPay}
            >
              <IndianRupee className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </div>
      </div>
    );
  };
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-green-600" />
          <p className="mt-4 text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-600" />
          <h2 className="mt-4 text-xl font-bold text-gray-800">Authentication Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <Button 
            className="mt-6 bg-green-600 hover:bg-green-700" 
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Dashboard</h1>
          {userData && (
            <p className="text-gray-500">Welcome back, {userData.name}</p>
          )}
        </div>
        <div className="mt-4 md:mt-0">
          <p className="text-sm text-gray-500">
            Connected as: <span className="font-mono">{userAddress?.substring(0, 6)}...{userAddress?.substring(userAddress.length - 4)}</span>
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-100 mb-6">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-green-50 border border-green-100 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="rations" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
            My Rations
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-green-700">
            Transaction History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {getStats().map((stat, index) => (
              <motion.div key={index} variants={item}>
                <Card className="border border-green-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                        <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                        <div className="flex items-center mt-1 text-sm">
                          <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-green-600">{stat.change}</span>
                        </div>
                      </div>
                      <div className={`${stat.color} p-3 rounded-full`}>
                        <stat.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Allocation Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border border-green-100">
              <CardHeader>
                <CardTitle>Ration Allocation History</CardTitle>
                <CardDescription>
                  Monthly allocation based on your category: {userData?.category === 1 ? "BPL" : userData?.category === 2 ? "APL" : "General"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Bar dataKey="rice" name="Rice (kg)" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wheat" name="Wheat (kg)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sugar" name="Sugar (kg)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="oil" name="Oil (L)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Payments */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border border-green-100">
                <CardHeader>
                  <CardTitle>Pending Payments</CardTitle>
                  <CardDescription>Rations allocated but not yet paid</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userRations.filter(r => !r.isPaid).length > 0 ? (
                      userRations.filter(r => !r.isPaid).map((ration) => (
                        <div key={ration.id} className="flex items-start space-x-4 pb-4 border-b border-green-100 last:border-0 last:pb-0">
                          <div className="w-2 h-2 mt-2 rounded-full bg-amber-500"></div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="text-sm font-medium">Ration #{ration.id}</h4>
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Payment</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Allocated on {formatDate(ration.date)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              From Depot #{ration.depotId}
                            </p>
                            <Button
                              className="mt-2 bg-green-600 hover:bg-green-700 text-sm h-8"
                              onClick={() => {
                                setSelectedRation(ration);
                                setPaymentAmount(ration.amount || "0.01");
                                setPaymentDialog(true);
                              }}
                            >
                              <IndianRupee className="h-3.5 w-3.5 mr-1" />
                              Pay {ration.amount || "0.01"} ETH
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-green-50/50 rounded-md">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-600">No pending payments</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border border-green-100">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest blockchain transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {txHistory.length > 0 ? (
                      txHistory.slice(0, 3).map((tx, i) => (
                        <div key={i} className="flex items-start space-x-4 pb-4 border-b border-green-100 last:border-0 last:pb-0">
                          <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="text-sm font-medium">{tx.type}</h4>
                              <span className="text-sm font-mono text-green-700">{tx.amount}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {tx.details}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(tx.timestamp)}
                            </p>
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-green-700 hover:underline flex items-center mt-1"
                            >
                              View on Etherscan
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-green-50/50 rounded-md">
                        <History className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-600">No transaction history yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                {txHistory.length > 3 && (
                  <CardFooter className="border-t border-green-100">
                    <Button 
                      variant="outline" 
                      className="w-full border-green-200 text-green-700"
                      onClick={() => setActiveTab('history')}
                    >
                      View All Transactions
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* My Rations Tab */}
        <TabsContent value="rations" className="space-y-6">
          <Card className="border border-green-100">
            <CardHeader>
              <CardTitle>My Ration Allocations</CardTitle>
              <CardDescription>View all allocated rations and make payments</CardDescription>
            </CardHeader>
            <CardContent>
              {userRations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50 hover:bg-green-100">
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Depot</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRations.map((ration) => (
                      <TableRow key={ration.id} className="hover:bg-green-50/50 border-b border-green-100">
                        <TableCell className="font-medium">{ration.id}</TableCell>
                        <TableCell>{formatDate(ration.date)}</TableCell>
                        <TableCell>#{ration.depotId}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ration.items.map((item, index) => (
                              <Badge key={index} variant="outline" className="bg-green-50 text-green-800 border-green-200">
                                {item.name}: {item.quantity}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ration.isPaid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">Payment Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!ration.isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-200 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedRation(ration);
                                setPaymentAmount(ration.amount || "0.01");
                                setPaymentDialog(true);
                              }}
                            >
                              <IndianRupee className="h-3.5 w-3.5 mr-1" />
                              Pay Now
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 bg-green-50/50 rounded-md">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-600">No rations allocated yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-green-100">
            <CardHeader>
              <CardTitle>Upcoming Allocations</CardTitle>
              <CardDescription>Schedule for upcoming ration distributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 pb-4 border-b border-green-100">
                  <div className="min-w-[60px] text-center">
                    <p className="text-sm font-bold text-green-700">May 15</p>
                    <p className="text-xs text-gray-500">Mon</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Regular Monthly Package</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Rice, wheat, oil, and pulses
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      At Depot #{userData?.depotId || "N/A"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 pb-4">
                  <div className="min-w-[60px] text-center">
                    <p className="text-sm font-bold text-green-700">Jun 01</p>
                    <p className="text-xs text-gray-500">Thu</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Quarterly Distribution</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Extended package with additional items
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      At Depot #{userData?.depotId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border border-green-100">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete record of your blockchain transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {txHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50 hover:bg-green-100">
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txHistory.map((tx, index) => (
                      <TableRow key={index} className="hover:bg-green-50/50 border-b border-green-100">
                        <TableCell className="font-medium">{tx.type}</TableCell>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        <TableCell>{tx.details}</TableCell>
                        <TableCell>
                          <span className="font-mono text-green-700">{tx.amount}</span>
                        </TableCell>
                        <TableCell>
                          {tx.txHash && (
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline flex items-center"
                            >
                              View on Etherscan
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 bg-green-50/50 rounded-md">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-600">No transaction history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[425px] border border-green-100">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Complete payment for your allocated ration
            </DialogDescription>
          </DialogHeader>
          
          {selectedRation && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 p-4 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ration ID:</span>
                  <span className="font-medium">{selectedRation.id}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Depot:</span>
                  <span className="font-medium">#{selectedRation.depotId}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{formatDate(selectedRation.date)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-mono font-bold text-green-700">{paymentAmount} ETH</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-700">Items included:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRation.items.map((item, index) => (
                    <Badge key={index} className="bg-green-50 text-green-800 border-green-200">
                      {item.name}: {item.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-green-200"
              onClick={() => setPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => payForRation(selectedRation.id, paymentAmount)}
              disabled={paying}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4 mr-2" />
                  Pay {paymentAmount} ETH
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Notification Popup */}
      {newAllocationNotice && (
        <PaymentNotification 
          notification={newAllocationNotice}
          onClose={() => setNewAllocationNotice(null)}
          onPay={() => handlePayNow(newAllocationNotice)}
        />
      )}
    </div>
  )
}