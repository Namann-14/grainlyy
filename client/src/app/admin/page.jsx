'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import AdminLayout from '@/components/AdminLayout';
import { ethers } from 'ethers';
import { getContract } from '@/utils/contract';

export default function AdminDashboard() {
  const { connected, provider, chainId } = useMetaMask();
  const router = useRouter();
  
  // User-Depot assignment form state
  const [userForDepot, setUserForDepot] = useState('');
  const [depotForUser, setDepotForUser] = useState('');
  const [assigningUser, setAssigningUser] = useState(false);
  const [userAssignSuccess, setUserAssignSuccess] = useState('');
  const [userAssignError, setUserAssignError] = useState('');
  
  // Delivery-Depot assignment form state
  const [deliveryPersonForDepot, setDeliveryPersonForDepot] = useState('');
  const [depotForDelivery, setDepotForDelivery] = useState('');
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [deliveryAssignSuccess, setDeliveryAssignSuccess] = useState('');
  const [deliveryAssignError, setDeliveryAssignError] = useState('');
  
  // Manual ration allocation form (will be hidden or removed)
  const [userId, setUserId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Shared state
  const [users, setUsers] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [depots, setDepots] = useState([]);
  const [usersByDepot, setUsersByDepot] = useState({});
  const [loading, setLoading] = useState(true);
  const [txHistory, setTxHistory] = useState([]);
  const [showManualAllocation, setShowManualAllocation] = useState(false);

  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('rationchain-tx-history');
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
        
        console.log("Connected to contract");
        
        // Fetch user count and user details
        const userCount = await contract.userCount();
        const usersData = [];
        const userDepotMap = {};
        
        console.log("User count:", userCount.toString());
        
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
            
            // Group users by depot for ration calculation
            if (userData.assignedDepotId !== '0') {
              if (!userDepotMap[userData.assignedDepotId]) {
                userDepotMap[userData.assignedDepotId] = [];
              }
              userDepotMap[userData.assignedDepotId].push(userData);
            }
            
            console.log("Fetched user:", user.name, "assigned to depot:", user.assignedDepotId.toString());
          } catch (error) {
            console.error(`Error fetching user ${i}:`, error);
          }
        }
        
        // Fetch delivery person count and details
        const deliveryPersonCount = await contract.deliveryPersonCount();
        const deliveryPersonsData = [];
        
        console.log("Delivery person count:", deliveryPersonCount.toString());
        
        for (let i = 1; i <= Number(deliveryPersonCount); i++) {
          try {
            const person = await contract.getDeliveryPersonDetails(i);
            
            // Convert assignedDepotIds from BigInt array to string array
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
            
            console.log("Fetched delivery person:", person.name, "assigned to depots:", assignedDepotIds.join(', '));
          } catch (error) {
            console.error(`Error fetching delivery person ${i}:`, error);
          }
        }
        
        // Fetch depot count and details
        const depotCount = await contract.depotCount();
        const depotsData = [];
        
        console.log("Depot count:", depotCount.toString());
        
        for (let i = 1; i <= Number(depotCount); i++) {
          try {
            const depot = await contract.getDepotDetails(i);
            depotsData.push({
              id: String(depot.id),
              name: depot.name,
              location: depot.location,
              walletAddress: depot.walletAddress
            });
            console.log("Fetched depot:", depot.name);
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
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('rationchain-tx-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save transaction history:', e);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Handle assigning user to depot
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
        window.location.reload();
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
        window.location.reload();
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
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Ration Management System</h1>
        
        {loading ? (
          <div className="text-center p-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Loading system data...</p>
          </div>
        ) : (
          <>
            {/* Assignment Forms Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* User to Depot Assignment Section */}
              <div className="bg-white shadow rounded-lg p-6">
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
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="userForDepot">
                      Select User
                    </label>
                    <select
                      id="userForDepot"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depotForUser">
                      Select Depot
                    </label>
                    <select
                      id="depotForUser"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      disabled={assigningUser}
                    >
                      {assigningUser ? 'Assigning...' : 'Assign User to Depot'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Delivery Person to Depot Assignment Section */}
              <div className="bg-white shadow rounded-lg p-6">
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
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deliveryPersonForDepot">
                      Select Delivery Person
                    </label>
                    <select
                      id="deliveryPersonForDepot"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={deliveryPersonForDepot}
                      onChange={(e) => setDeliveryPersonForDepot(e.target.value)}
                      required
                    >
                      <option value="">Select Delivery Person</option>
                      {deliveryPersons.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} (ID: {person.id})
                          {person.assignedDepotIds.length > 0 ? ` - Assigned to ${person.assignedDepotIds.length} depot(s)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="depotForDelivery">
                      Select Depot
                    </label>
                    <select
                      id="depotForDelivery"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      disabled={assigningDelivery}
                    >
                      {assigningDelivery ? 'Processing...' : 'Assign Delivery Person to Depot'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Ration Allocation Section - Always visible */}
            <div className="bg-white shadow rounded-lg p-6 mt-8">
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
                        className="text-blue-600 hover:underline"
                      >
                        View on Sepolia Explorer
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              <form onSubmit={handleRationAllocation}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="userId">
                    Select Beneficiary
                  </label>
                  <select
                    id="userId"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deliveryPersonId">
                    Select Delivery Person
                  </label>
                  <select
                    id="deliveryPersonId"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                    Amount (ETH)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.0001"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the payment amount that will be transferred to the delivery person upon completion.
                  </p>
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    disabled={submitting}
                  >
                    {submitting ? 'Allocating...' : 'Allocate Ration'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Transaction History Section */}
            {txHistory.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 mt-8">
                <h2 className="text-xl font-bold mb-4">Transaction History</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {txHistory.slice().reverse().map((tx, index) => (
                        <tr key={index}>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {tx.type}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {formatDate(tx.timestamp)}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {tx.details}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View on Sepolia
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Stats section to summarize assignments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-blue-800 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                <p className="text-sm text-blue-600 mt-2">
                  {users.filter(u => u.assignedDepotId !== '0').length} assigned to depots
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-green-800 mb-2">Total Depots</h3>
                <p className="text-3xl font-bold text-green-600">{depots.length}</p>
                <p className="text-sm text-green-600 mt-2">
                  {Object.keys(usersByDepot).length} have users assigned
                </p>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-indigo-800 mb-2">Delivery Personnel</h3>
                <p className="text-3xl font-bold text-indigo-600">{deliveryPersons.length}</p>
                <p className="text-sm text-indigo-600 mt-2">
                  {deliveryPersons.filter(d => d.assignedDepotIds.length > 0).length} assigned to depots
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}