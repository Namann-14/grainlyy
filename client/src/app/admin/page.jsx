'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import AdminLayout from '@/components/AdminLayout';
import { ethers } from 'ethers';
import { getContract } from '@/utils/contract';
import { motion } from "framer-motion";
import { 
  ArrowUpRight, CheckCircle2, Clock, Package, 
  Truck, Users, Wallet, Building, UserCheck 
} from "lucide-react";

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

export default function AdminDashboard() {
  const { connected, provider, chainId } = useMetaMask();
  const router = useRouter();
  
  // Form states
  const [userForDepot, setUserForDepot] = useState('');
  const [depotForUser, setDepotForUser] = useState('');
  const [deliveryPersonForDepot, setDeliveryPersonForDepot] = useState('');
  const [depotForDelivery, setDepotForDelivery] = useState('');
  const [userId, setUserId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');
  const [amount, setAmount] = useState('0.01');
  
  // Status states
  const [assigningUser, setAssigningUser] = useState(false);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Message states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userAssignSuccess, setUserAssignSuccess] = useState('');
  const [userAssignError, setUserAssignError] = useState('');
  const [deliveryAssignSuccess, setDeliveryAssignSuccess] = useState('');
  const [deliveryAssignError, setDeliveryAssignError] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // Data states
  const [users, setUsers] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [depots, setDepots] = useState([]);
  const [usersByDepot, setUsersByDepot] = useState({});
  const [txHistory, setTxHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showManualAllocation, setShowManualAllocation] = useState(false);

  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('Grainlyyy-tx-history');
    if (savedHistory) {
      try {
        setTxHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse transaction history:', e);
      }
    }
  }, []);

  // Fetch entities data from blockchain
  useEffect(() => {
    if (!connected || !provider) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Create ethers provider from MetaMask provider
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        
        // Fetch user, delivery person, and depot data
        // (Existing fetch logic preserved)
        
        const userCount = await contract.userCount();
        const usersData = [];
        const userDepotMap = {};
        
        for (let i = 1; i <= Number(userCount); i++) {
          try {
            const user = await contract.getUserDetails(i);
            const userData = {
              id: String(user.id),
              name: user.name,
              category: String(user.category),
              walletAddress: user.walletAddress,
              assignedDepotId: String(user.assignedDepotId)
            };
            
            usersData.push(userData);
            
            if (userData.assignedDepotId !== '0') {
              if (!userDepotMap[userData.assignedDepotId]) {
                userDepotMap[userData.assignedDepotId] = [];
              }
              userDepotMap[userData.assignedDepotId].push(userData);
            }
          } catch (error) {
            console.error(`Error fetching user ${i}:`, error);
          }
        }
        
        const deliveryPersonCount = await contract.deliveryPersonCount();
        const deliveryPersonsData = [];
        
        for (let i = 1; i <= Number(deliveryPersonCount); i++) {
          try {
            const person = await contract.getDeliveryPersonDetails(i);
            
            const assignedDepotIds = [];
            for (let j = 0; j < person.assignedDepotIds.length; j++) {
              assignedDepotIds.push(String(person.assignedDepotIds[j]));
            }
            
            deliveryPersonsData.push({
              id: String(person.id),
              name: person.name,
              walletAddress: person.walletAddress,
              assignedDepotIds: assignedDepotIds
            });
          } catch (error) {
            console.error(`Error fetching delivery person ${i}:`, error);
          }
        }
        
        const depotCount = await contract.depotCount();
        const depotsData = [];
        
        for (let i = 1; i <= Number(depotCount); i++) {
          try {
            const depot = await contract.getDepotDetails(i);
            depotsData.push({
              id: String(depot.id),
              name: depot.name,
              location: depot.location,
              walletAddress: depot.walletAddress
            });
          } catch (error) {
            console.error(`Error fetching depot ${i}:`, error);
          }
        }
        
        setUsers(usersData);
        setDeliveryPersons(deliveryPersonsData);
        setDepots(depotsData);
        setUsersByDepot(userDepotMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data from blockchain: ' + (error.message || error.toString()));
        setLoading(false);
      }
    };

    fetchData();
  }, [connected, provider, router]);

  // Save transaction to history
  const saveTransaction = (txData) => {
    const updatedHistory = [...txHistory, txData];
    setTxHistory(updatedHistory);
    
    try {
      localStorage.setItem('Grainlyyy-tx-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save transaction history:', e);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleUserAssignment = async (e) => {
    e.preventDefault();
    setAssigningUser(true);
    setUserAssignError('');
    setUserAssignSuccess('');
    
    try {
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      console.log("Assigning user to depot...");
      // Using the correct function name
      const assignUserTx = await contract.assignDepot(userForDepot, depotForUser);
      const userAssignReceipt = await assignUserTx.wait();
      
      // Save this transaction to history
      saveTransaction({
        type: 'Assign User to Depot',
        txHash: assignUserTx.hash,
        timestamp: Date.now(),
        details: `User ID: ${userForDepot}, Depot ID: ${depotForUser}`
      });
      
      console.log("User assigned to depot successfully");
      setUserAssignSuccess(`User successfully assigned to depot. Transaction: ${assignUserTx.hash}`);
      
      // Reset form
      setUserForDepot('');
      setDepotForUser('');
      
      // Refresh data to update the usersByDepot mapping
      setTimeout(() => {
        router.reload();
      }, 2000);
    } catch (error) {
      console.error('Error assigning user to depot:', error);
      setUserAssignError('Failed to assign user to depot: ' + (error.message || error.toString()));
    } finally {
      setAssigningUser(false);
    }
  };

  // Handle assigning delivery person to depot WITHOUT automatic ration allocation
  const handleDeliveryAssignment = async (e) => {
    e.preventDefault();
    setAssigningDelivery(true);
    setDeliveryAssignError('');
    setDeliveryAssignSuccess('');
    
    try {
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      console.log("Assigning delivery person to depot...");
      const assignTx = await contract.assignDeliveryPersonToDepot(deliveryPersonForDepot, depotForDelivery);
      const deliveryAssignReceipt = await assignTx.wait();
      
      // Save this transaction to history
      saveTransaction({
        type: 'Assign Delivery Person to Depot',
        txHash: assignTx.hash,
        timestamp: Date.now(),
        details: `Delivery Person ID: ${deliveryPersonForDepot}, Depot ID: ${depotForDelivery}`
      });
      
      console.log("Delivery person assigned to depot successfully");
      setDeliveryAssignSuccess(`Delivery person successfully assigned to depot. Both will now see this assignment on their dashboards.`);
      
      // Reset form
      setDeliveryPersonForDepot('');
      setDepotForDelivery('');
      
      // Refresh to show updated data
      setTimeout(() => {
        router.reload();
      }, 2000);
    } catch (error) {
      console.error('Error assigning delivery person to depot:', error);
      setDeliveryAssignError('Failed to assign delivery person to depot: ' + (error.message || error.toString()));
    } finally {
      setAssigningDelivery(false);
    }
  };
  
  // Handle ration allocation
  // Make sure this function is correctly implemented
const handleRationAllocation = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError('');
  setSuccess('');
  setTxHash('');
  
  try {
    if (!userId || !deliveryPersonId || !amount) {
      setError('Please fill all fields');
      setSubmitting(false);
      return;
    }
    
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const contract = getContract(signer);
    
    // Important: Log what's happening
    console.log("Allocating ration with:");
    console.log("- User ID:", userId);
    console.log("- Delivery Person ID:", deliveryPersonId);
    console.log("- Amount:", amount, "ETH");
    
    const amountInWei = ethers.parseEther(amount);
    
    // This is the critical function that creates a delivery in the blockchain
    const tx = await contract.allocateRation(userId, deliveryPersonId, amountInWei);
    console.log("Transaction submitted:", tx.hash);
    setTxHash(tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
    
    // Save this transaction to history
    saveTransaction({
      type: 'Allocate Ration',
      txHash: tx.hash,
      timestamp: Date.now(),
      details: `User ID: ${userId}, Delivery Person ID: ${deliveryPersonId}, Amount: ${amount} ETH`
    });
    
    // Reset form
    setUserId('');
    setDeliveryPersonId('');
    setAmount('0.01');
    
    setSuccess(`Successfully allocated ration. Delivery person can now start the delivery process.`);
  } catch (error) {
    console.error('Error allocating ration:', error);
    setError('Failed to allocate ration: ' + (error.message || error.toString()));
  } finally {
    setSubmitting(false);
  }
};

  // Calculate stats for dashboard
  const stats = [
    {
      title: "Total Users",
      value: users.length.toString(),
      change: `${users.filter(u => u.assignedDepotId !== '0').length} assigned`,
      icon: Users,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Active Depots",
      value: depots.length.toString(),
      change: `${Object.keys(usersByDepot).length} with users`,
      icon: Building,
      color: "bg-green-50 text-green-700",
    },
    {
      title: "Delivery Personnel",
      value: deliveryPersons.length.toString(),
      change: `${deliveryPersons.filter(d => d.assignedDepotIds.some(id => id !== '0')).length} assigned`,
      icon: Truck,
      color: "bg-purple-50 text-purple-700",
    },
    {
      title: "Transactions",
      value: txHistory.length.toString(),
      change: "View history",
      icon: Wallet,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  // Get status color based on transaction type
  const getStatusColor = (type) => {
    switch (type) {
      case "Allocate Ration":
        return "bg-green-100 text-green-800";
      case "Assign User to Depot":
        return "bg-blue-100 text-blue-800";
      case "Assign Delivery Person to Depot":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusIcon = (type) => {
    switch (type) {
      case "Allocate Ration":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Assign User to Depot":
        return <UserCheck className="h-4 w-4" />;
      case "Assign Delivery Person to Depot":
        return <Truck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Dashboard</h1>
          <p className="text-muted-foreground text-gray-600">
            Welcome to the Grainlyyy dashboard.
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="w-full">
            <div className="bg-white border border-green-100 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'overview' 
                    ? 'bg-green-50 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'assignments' 
                    ? 'bg-green-50 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Assignments
              </button>
              <button
                onClick={() => setActiveTab('allocation')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'allocation' 
                    ? 'bg-green-50 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Allocation
              </button>
            </div>
            
            {loading ? (
              <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
                <p>Loading system data...</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="mt-6">
                    <motion.div
                      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                    >
                      {stats.map((stat, index) => (
                        <motion.div key={index} variants={itemVariants}>
                          <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
                            <div className="flex items-center justify-between pb-2">
                              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                              <div className={`rounded-full p-2 ${stat.color}`}>
                                <stat.icon className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                              {stat.change}
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Transaction History */}
                    <motion.div
                      className="mt-6"
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: 0.3 }}
                    >
                      <div className="bg-white shadow-sm rounded-lg border border-green-100">
                        <div className="px-6 py-4 border-b border-green-100">
                          <h2 className="text-xl font-bold">Transaction History</h2>
                          <p className="text-sm text-gray-600">Recent blockchain transactions</p>
                        </div>
                        <div className="overflow-x-auto">
                          {txHistory.length > 0 ? (
                            <table className="w-full">
                              <thead className="bg-green-50">
                                <tr>
                                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Type
                                  </th>
                                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Details
                                  </th>
                                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {txHistory.slice().reverse().map((tx, index) => (
                                  <motion.tr 
                                    key={index}
                                    className="hover:bg-green-50/50"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * index, duration: 0.2 }}
                                  >
                                    <td className="py-3 px-6 border-b border-green-100">
                                      <div className="flex items-center">
                                        <div className={`rounded-full p-1 mr-2 ${getStatusColor(tx.type)}`}>
                                          {getStatusIcon(tx.type)}
                                        </div>
                                        {tx.type}
                                      </div>
                                    </td>
                                    <td className="py-3 px-6 border-b border-green-100">
                                      {formatDate(tx.timestamp)}
                                    </td>
                                    <td className="py-3 px-6 border-b border-green-100">
                                      {tx.details}
                                    </td>
                                    <td className="py-3 px-6 border-b border-green-100">
                                      <a 
                                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:underline flex items-center"
                                      >
                                        View on Sepolia
                                        <ArrowUpRight className="ml-1 h-3 w-3" />
                                      </a>
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-12">
                              <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                              <p className="text-gray-500">No transactions found</p>
                            </div>
                          )}
                        </div>
                        <div className="px-6 py-4 flex justify-between border-t border-green-100">
                          <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
                            Previous
                          </button>
                          <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
                            Next
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* Stats Summary */}
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div variants={itemVariants}>
                        <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-blue-800 mb-2">Total Users</h3>
                          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                          <p className="text-sm text-blue-600 mt-2">
                            {users.filter(u => u.assignedDepotId !== '0').length} assigned to depots
                          </p>
                        </div>
                      </motion.div>
                      
                      <motion.div variants={itemVariants}>
                        <div className="bg-green-50 rounded-lg p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-green-800 mb-2">Total Depots</h3>
                          <p className="text-3xl font-bold text-green-600">{depots.length}</p>
                          <p className="text-sm text-green-600 mt-2">
                            {Object.keys(usersByDepot).length} have users assigned
                          </p>
                        </div>
                      </motion.div>
                      
                      <motion.div variants={itemVariants}>
                        <div className="bg-indigo-50 rounded-lg p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-indigo-800 mb-2">Delivery Personnel</h3>
                          <p className="text-3xl font-bold text-indigo-600">{deliveryPersons.length}</p>
                          <p className="text-sm text-indigo-600 mt-2">
                            {deliveryPersons.filter(d => d.assignedDepotIds.some(id => id !== '0')).length} assigned to depots
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                  <div className="mt-6">
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                    >
                      {/* User to Depot Assignment Section */}
                      <motion.div variants={itemVariants}>
                        <div className="bg-white shadow-sm rounded-lg border border-green-100 p-6">
                          <h2 className="text-xl font-bold mb-4">Assign User to Depot</h2>
                          
                          {userAssignError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                              {userAssignError}
                            </div>
                          )}
                          
                          {userAssignSuccess && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                              {userAssignSuccess}
                            </div>
                          )}
                          
                          <form onSubmit={handleUserAssignment}>
                            <div className="mb-4">
                              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="userForDepot">
                                Select User
                              </label>
                              <select
                                id="userForDepot"
                                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={userForDepot}
                                onChange={(e) => setUserForDepot(e.target.value)}
                                required
                              >
                                <option value="">Select User</option>
                                {users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name} (ID: {user.id}) {user.assignedDepotId !== '0' ? '- Already assigned' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="mb-4">
                              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="depotForUser">
                                Select Depot
                              </label>
                              <select
                                id="depotForUser"
                                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={depotForUser}
                                onChange={(e) => setDepotForUser(e.target.value)}
                                required
                              >
                                <option value="">Select Depot</option>
                                {depots.map((depot) => (
                                  <option key={depot.id} value={depot.id}>
                                    {depot.name} - {depot.location} (ID: {depot.id})
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex items-center justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                                disabled={assigningUser}
                              >
                                {assigningUser ? 'Assigning...' : 'Assign User to Depot'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>

                      {/* Delivery Person to Depot Assignment Section */}
                      <motion.div variants={itemVariants}>
                        <div className="bg-white shadow-sm rounded-lg border border-green-100 p-6">
                          <h2 className="text-xl font-bold mb-4">Assign Delivery Person to Depot</h2>
                          <p className="text-sm text-gray-600 mb-4">
                            This will assign a delivery person to the selected depot. Both the delivery person and 
                            depot will see this assignment on their respective dashboards.
                          </p>
                          
                          {deliveryAssignError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                              {deliveryAssignError}
                            </div>
                          )}
                          
                          {deliveryAssignSuccess && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                              {deliveryAssignSuccess}
                            </div>
                          )}
                          
                          <form onSubmit={handleDeliveryAssignment}>
                            <div className="mb-4">
                              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="deliveryPersonForDepot">
                                Select Delivery Person
                              </label>
                              <select
                                id="deliveryPersonForDepot"
                                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={deliveryPersonForDepot}
                                onChange={(e) => setDeliveryPersonForDepot(e.target.value)}
                                required
                              >
                                <option value="">Select Delivery Person</option>
                                {deliveryPersons.map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {person.name} (ID: {person.id})
                                    {person.assignedDepotIds.some(id => id !== '0') ? 
                                      ` - Assigned to ${person.assignedDepotIds.filter(id => id !== '0').length} depot(s)` : 
                                      ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="mb-4">
                              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="depotForDelivery">
                                Select Depot
                              </label>
                              <select
                                id="depotForDelivery"
                                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={depotForDelivery}
                                onChange={(e) => setDepotForDelivery(e.target.value)}
                                required
                              >
                                <option value="">Select Depot</option>
                                {depots.map((depot) => {
                                  const userCount = (usersByDepot[depot.id] || []).length;
                                  return (
                                    <option key={depot.id} value={depot.id}>
                                      {depot.name} - {depot.location} (ID: {depot.id}) - {userCount} user(s)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            
                            <div className="flex items-center justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                                disabled={assigningDelivery}
                              >
                                {assigningDelivery ? 'Processing...' : 'Assign Delivery Person'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                {/* Allocation Tab */}
                {activeTab === 'allocation' && (
                  <motion.div 
                    className="mt-6"
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <div className="bg-white shadow-sm rounded-lg border border-green-100 p-6">
                      <h2 className="text-xl font-bold mb-4">Allocate Ration</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Create a delivery by allocating ration to a user through a delivery person. This is required before 
                        the delivery person can start the delivery process.
                      </p>
                      
                      {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                          {error}
                        </div>
                      )}
                      
                      {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                          {success}
                          {txHash && (
                            <div className="mt-2">
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                              >
                                View on Sepolia Explorer
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <form onSubmit={handleRationAllocation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="userId">
                            Select Beneficiary
                          </label>
                          <select
                            id="userId"
                            className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                          >
                            <option value="">Select Beneficiary</option>
                            {users.filter(user => user.assignedDepotId !== '0').map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} (ID: {user.id}) - Depot: {
                                  depots.find(d => d.id === user.assignedDepotId)?.name || 'Unknown'
                                }
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="deliveryPersonId">
                            Select Delivery Person
                          </label>
                          <select
                            id="deliveryPersonId"
                            className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={deliveryPersonId}
                            onChange={(e) => setDeliveryPersonId(e.target.value)}
                            required
                          >
                            <option value="">Select Delivery Person</option>
                            {deliveryPersons.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name} (ID: {person.id})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="amount">
                            Amount (ETH)
                          </label>
                          <input
                            id="amount"
                            type="number"
                            step="0.0001"
                            className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This is the payment amount that will be transferred to the delivery person upon completion.
                          </p>
                        </div>
                        
                        <div className="md:flex items-end justify-end">
                          <button
                            type="submit"
                            className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                            disabled={submitting}
                          >
                            {submitting ? (
                              <>
                                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></span>
                                Allocating...
                              </>
                            ) : 'Allocate Ration'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}