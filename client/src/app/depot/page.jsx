'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import { ethers } from 'ethers';
import { getContract } from '../../utils/contract';
import DepotLayout from '../../components/DepotLayout';

export default function DepotDashboard() {
  const { connected, provider, chainId } = useMetaMask();
  const router = useRouter();
  
  // Depot details
  const [depotId, setDepotId] = useState('');
  const [depotName, setDepotName] = useState('');
  const [depotLocation, setDepotLocation] = useState('');
  
  // Users and deliveries
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignedDeliveryPersons, setAssignedDeliveryPersons] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  
  // OTP verification
  const [otpInput, setOtpInput] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [currentOTP, setCurrentOTP] = useState('');
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpError, setOtpError] = useState('');
  
  // Ration distribution
  const [rationDistributions, setRationDistributions] = useState([]);
  
  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txHistory, setTxHistory] = useState([]);
  

  
  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('rationchain-depot-tx-history');
    if (savedHistory) {
      try {
        setTxHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse transaction history:', e);
      }
    }
  }, []);
  
  // Save transaction to history
  const saveTransaction = (txData) => {
    const updatedHistory = [...txHistory, txData];
    setTxHistory(updatedHistory);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('rationchain-depot-tx-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save transaction history:', e);
    }
  };
  
  // Initialize and fetch depot data
  useEffect(() => {
    if (!connected || !provider) {
      router.push('/');
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
            
            if (depot.walletAddress.toLowerCase() === signerAddress.toLowerCase()) {
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
        console.error('Error fetching depot data:', error);
        setError('Failed to load your data from blockchain: ' + (error.message || error.toString()));
        setLoading(false);
      }
    };
    
    fetchData();
  }, [connected, provider, router]);
  
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
              lastRationDate: user.lastRationDate || null
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${i}:`, error);
        }
      }
      
      setAssignedUsers(usersData);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
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
          const assignedDepotIds = person.assignedDepotIds.map(id => String(id));
          if (assignedDepotIds.includes(depotId)) {
            deliveryPersonsData.push({
              id: String(person.id),
              name: person.name,
              walletAddress: person.walletAddress,
              phone: person.phone || ''
            });
          }
        } catch (error) {
          console.error(`Error fetching delivery person ${i}:`, error);
        }
      }
      
      setAssignedDeliveryPersons(deliveryPersonsData);
    } catch (error) {
      console.error('Error fetching assigned delivery persons:', error);
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
              status: 'scheduled',
              scheduledDate: new Date(Date.now() + 86400000 * i).toISOString(),
              users: []
            });
          } else {
            completedDeliveriesData.push({
              id: `DEL${i}`,
              deliveryPersonId: String(i),
              deliveryPersonName: `Delivery Person ${i}`,
              status: 'completed',
              completedDate: new Date(Date.now() - 86400000 * i).toISOString(),
              users: []
            });
          }
        } catch (error) {
          console.error(`Error fetching delivery ${i}:`, error);
        }
      }
      
      setPendingDeliveries(pendingDeliveriesData);
      setCompletedDeliveries(completedDeliveriesData);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
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
          category: `Category ${i % 3 + 1}`,
          date: new Date(Date.now() - 86400000 * i).toISOString(),
          items: [
            { name: 'Rice', quantity: '5kg' },
            { name: 'Wheat', quantity: '3kg' },
            { name: 'Sugar', quantity: '1kg' },
            { name: 'Oil', quantity: '1L' }
          ]
        });
      }
      
      setRationDistributions(rationData);
    } catch (error) {
      console.error('Error fetching ration distributions:', error);
    }
  };
  
  // Receive delivery person
  const receiveDeliveryPerson = async (deliveryPersonId) => {
    try {
      // Find the delivery person in the assigned list
      const deliveryPerson = assignedDeliveryPersons.find(person => person.id === deliveryPersonId);
      
      if (!deliveryPerson) {
        setError('Selected delivery person not found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Simulate getting OTP from blockchain
      // In a real app, this would be generated by the delivery person
      const simulatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setReceivedOtp(simulatedOtp);
      
      // Set active delivery
      setActiveDelivery({
        deliveryPersonId: deliveryPersonId,
        deliveryPersonName: deliveryPerson.name,
        status: 'in-progress',
        startTime: new Date().toISOString(),
        otp: simulatedOtp
      });
      
      // Remove from pending deliveries
      const updatedPendingDeliveries = pendingDeliveries.filter(
        delivery => delivery.deliveryPersonId !== deliveryPersonId
      );
      setPendingDeliveries(updatedPendingDeliveries);
      
      saveTransaction({
        type: 'Start Delivery',
        timestamp: Date.now(),
        details: `Started delivery process with Delivery Person ID: ${deliveryPersonId}`
      });
    } catch (error) {
      console.error('Error receiving delivery person:', error);
      setError('Failed to receive delivery person: ' + (error.message || error.toString()));
    }
  };
  // Replace the current generateOTP function with this corrected version

const generateOTP = async () => {
  try {
    setGeneratingOtp(true);
    setOtpError('');
    
    if (!activeDelivery) {
      setOtpError('No active delivery found');
      return null;
    }
    
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const contract = getContract(signer);
    
    console.log(`Generating OTP for active delivery with delivery person: ${activeDelivery.deliveryPersonId}`);
    
    // Use deliveryPersonId instead of deliveryId since that's what we have
    const tx = await contract.generateOTP(activeDelivery.deliveryPersonId);
    const receipt = await tx.wait();
    
    // For testing purposes, generate a random OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    setCurrentOTP(generatedOtp);
    setOtpSuccess(`OTP generated successfully: ${generatedOtp}`);
    
    // Save transaction to history
    saveTransaction({
      type: 'Generate OTP',
      txHash: tx.hash,
      timestamp: Date.now(),
      details: `OTP generated for delivery person: ${activeDelivery.deliveryPersonName}`
    });
    
    return generatedOtp;
  } catch (error) {
    console.error('Error generating OTP:', error);
    setOtpError(`Failed to generate OTP: ${error.message || error.toString()}`);
    return null;
  } finally {
    setGeneratingOtp(false);
  }
};
  
  // Verify OTP
  const verifyOTP = async () => {
    try {
      setVerifyingOtp(true);
      setOtpError('');
      setOtpSuccess('');
      
      if (!activeDelivery) {
        setOtpError('No active delivery found');
        return;
      }
      
      if (otpInput !== receivedOtp) {
        setOtpError('OTP does not match. Please try again.');
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
        type: 'Verify OTP',
        txHash: verifyTx.hash,
        timestamp: Date.now(),
        details: `OTP verified for Delivery Person ID: ${activeDelivery.deliveryPersonId}`
      });
      
      setOtpSuccess('OTP verified successfully! Proceeding to location verification.');
      
      // Update active delivery status
      const updatedDelivery = {...activeDelivery, status: 'authenticated'};
      setActiveDelivery(updatedDelivery);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('Failed to verify OTP: ' + (error.message || error.toString()));
    } finally {
      setVerifyingOtp(false);
    }
  };
  
  // Complete delivery
  const completeDelivery = async () => {
    try {
      if (!activeDelivery) {
        setError('No active delivery found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Call contract to complete delivery
      const completeTx = await contract.completeDelivery(
        depotId,
        activeDelivery.deliveryPersonId
      );
      await completeTx.wait();
      
      saveTransaction({
        type: 'Complete Delivery',
        txHash: completeTx.hash,
        timestamp: Date.now(),
        details: `Delivery completed with Delivery Person ID: ${activeDelivery.deliveryPersonId}`
      });
      
      // Update delivery status
      const completedDelivery = {
        ...activeDelivery,
        status: 'completed',
        completedDate: new Date().toISOString()
      };
      setCompletedDeliveries([completedDelivery, ...completedDeliveries]);
      
      // Reset active delivery
      setActiveDelivery(null);
      setOtpInput('');
      setReceivedOtp('');
      setOtpSuccess('');
      setOtpError('');
      
      alert('Delivery completed successfully! Funds have been transferred to the delivery person.');
    } catch (error) {
      console.error('Error completing delivery:', error);
      setError('Failed to complete delivery: ' + (error.message || error.toString()));
    }
  };
  
  // Verify location
  const verifyLocation = async () => {
    try {
      if (!activeDelivery) {
        setError('No active delivery found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Get current location
      let currentLocation = null;
      
      if (navigator.geolocation) {
        currentLocation = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              reject(error);
            }
          );
        });
      } else {
        throw new Error('Geolocation is not supported by your browser');
      }
      
      // Call contract to verify location
      const verifyTx = await contract.verifyLocation(
        depotId,
        currentLocation.latitude.toString(),
        currentLocation.longitude.toString(),
        activeDelivery.deliveryPersonId
      );
      await verifyTx.wait();
      
      saveTransaction({
        type: 'Verify Location',
        txHash: verifyTx.hash,
        timestamp: Date.now(),
        details: `Location verified for Delivery Person ID: ${activeDelivery.deliveryPersonId}`
      });
      
      // Update active delivery status
      const updatedDelivery = {...activeDelivery, status: 'location-verified'};
      setActiveDelivery(updatedDelivery);
      
      alert('Location verified successfully! You can now proceed with ration distribution.');
    } catch (error) {
      console.error('Error verifying location:', error);
      setError('Failed to verify location: ' + (error.message || error.toString()));
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
        activeDelivery ? activeDelivery.deliveryPersonId : '0'
      );
      await trackTx.wait();
      
      saveTransaction({
        type: 'Allocate Ration',
        txHash: trackTx.hash,
        timestamp: Date.now(),
        details: `Ration allocated to User ID: ${userId}`
      });
      
      // Update ration distributions
      const user = assignedUsers.find(u => u.id === userId);
      const newDistribution = {
        id: `RAT${Date.now()}`,
        userId: userId,
        userName: user ? user.name : `User ${userId}`,
        category: user ? user.category : 'Unknown',
        date: new Date().toISOString(),
        items: items || [
          { name: 'Rice', quantity: '5kg' },
          { name: 'Wheat', quantity: '3kg' },
          { name: 'Sugar', quantity: '1kg' },
          { name: 'Oil', quantity: '1L' }
        ]
      };
      
      setRationDistributions([newDistribution, ...rationDistributions]);
      
      // Update user's last ration date
      const updatedUsers = assignedUsers.map(u => {
        if (u.id === userId) {
          return {...u, lastRationDate: new Date().toISOString()};
        }
        return u;
      });
      
      setAssignedUsers(updatedUsers);
      
      alert('Ration distribution tracked successfully!');
    } catch (error) {
      console.error('Error tracking ration distribution:', error);
      setError('Failed to track ration distribution: ' + (error.message || error.toString()));
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Calculate days since last ration
  const daysSinceLastRation = (lastRationDate) => {
    if (!lastRationDate) return 'Never';
    const lastDate = new Date(lastRationDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  return (
    <DepotLayout>
      <Head>
        <title>Depot Dashboard | RationChain</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Depot Dashboard</h1>
            {!loading && depotName && (
              <p className="text-lg text-gray-600">Welcome, {depotName}</p>
            )}
            {!loading && depotLocation && (
              <p className="text-sm text-gray-500">Location: {depotLocation}</p>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="text-center p-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            {activeDelivery ? (
              // Active delivery section
              <div className="grid grid-cols-1 gap-8 mb-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Active Delivery</h2>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                      {activeDelivery.status === 'authenticated' ? 'OTP Verified' : 
                       activeDelivery.status === 'location-verified' ? 'Location Verified' : 'In Progress'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-gray-600 mb-2">Delivery Person:</p>
                      <p className="font-medium">{activeDelivery.deliveryPersonName} (ID: {activeDelivery.deliveryPersonId})</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-2">Start Time:</p>
                      <p className="font-medium">{formatDate(activeDelivery.startTime)}</p>
                    </div>
                  </div>
                  
                 

{/* OTP Generation and Display */}
{activeDelivery && (
  <div className="mt-4">
    {otpError && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {otpError}
      </div>
    )}
    
    {otpSuccess && (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {otpSuccess}
      </div>
    )}
    
    {currentOTP && (
      <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Verification OTP</h3>
        <div className="bg-white p-3 border border-green-200 rounded-lg text-center">
          <p className="text-3xl font-mono font-bold tracking-widest">{currentOTP}</p>
        </div>
        <p className="mt-2 text-sm text-green-700">
          Show this OTP to the delivery person for verification. 
          They need to enter this code in their dashboard.
        </p>
      </div>
    )}
    
    <div className="mt-4">

<button 
  onClick={generateOTP}  // Updated - no parameters needed
  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
  disabled={generatingOtp || !activeDelivery}
>
  {generatingOtp ? 'Generating...' : 'Generate OTP for Verification'}
</button>
    </div>
  </div>
)}      
                  {/* Location Verification Section */}
                  {activeDelivery.status === 'authenticated' && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold mb-4">Location Verification</h3>
                      
                      <div className="flex items-center">
                        <button
                          onClick={verifyLocation}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Verify Location
                        </button>
                        <p className="ml-4 text-sm text-gray-600">
                          Click to verify the delivery person's location
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Complete Delivery Button */}
                  {activeDelivery.status === 'location-verified' && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={completeDelivery}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold px-6 py-3 rounded"
                      >
                        Complete Delivery
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Assigned Users Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Assigned Beneficiaries</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Last Ration
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedUsers.length > 0 ? (
                        assignedUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {user.id}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {user.name}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {user.category}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {user.lastRationDate ? (
                                <>
                                  {formatDate(user.lastRationDate)}
                                  <span className="block text-xs text-gray-500">
                                    ({daysSinceLastRation(user.lastRationDate)} days ago)
                                  </span>
                                </>
                              ) : (
                                'Never'
                              )}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              <button
                                onClick={() => trackRationDistribution(user.id)}
                                className="px-3 py-1 rounded bg-green-500 hover:bg-green-700 text-white text-sm"
                              >
                                Track Ration
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                            No users assigned to this depot
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Assigned Delivery Persons Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Assigned Delivery Persons</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedDeliveryPersons.length > 0 ? (
                        assignedDeliveryPersons.map((person) => (
                          <tr key={person.id}>
                                                       <td className="py-2 px-4 border-b border-gray-200">
                              {person.id}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {person.name}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {person.phone || 'Not Available'}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              <button
                                onClick={() => receiveDeliveryPerson(person.id)}
                                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-700 text-white text-sm"
                                disabled={activeDelivery !== null}
                              >
                                Receive Delivery Person
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-4 px-4 text-center text-gray-500">
                            No delivery persons assigned to this depot
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Pending and Completed Deliveries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Pending Deliveries */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Pending Deliveries</h2>
                
                {pendingDeliveries.length > 0 ? (
                  <div className="space-y-4">
                    {pendingDeliveries.map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold">Delivery ID: {delivery.id}</h3>
                            <p className="text-gray-600 text-sm">Delivery Person: {delivery.deliveryPersonName}</p>
                            <p className="text-gray-600 text-sm">Scheduled: {formatDate(delivery.scheduledDate)}</p>
                          </div>
                          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                            {delivery.status === 'scheduled' ? 'Scheduled' : 'In Progress'}
                          </span>
                        </div>
                        <button
                          onClick={() => receiveDeliveryPerson(delivery.deliveryPersonId)}
                          className="mt-3 bg-blue-500 hover:bg-blue-700 text-white py-1 px-4 rounded"
                          disabled={activeDelivery !== null}
                        >
                          Receive Delivery
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No pending deliveries</p>
                  </div>
                )}
              </div>
              
              {/* Completed Deliveries */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Completed Deliveries</h2>
                
                {completedDeliveries.length > 0 ? (
                  <div className="overflow-y-auto max-h-80">
                    <table className="min-w-full bg-white border">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Delivery Person
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedDeliveries.map((delivery) => (
                          <tr key={delivery.id}>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {delivery.id}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {delivery.deliveryPersonName}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {formatDate(delivery.completedDate)}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No completed deliveries yet</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Ration Distributions and Transaction History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Recent Ration Distributions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Recent Ration Distributions</h2>
                
                {rationDistributions.length > 0 ? (
                  <div className="overflow-y-auto max-h-80">
                    <table className="min-w-full bg-white border">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Beneficiary
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Items
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rationDistributions.map((ration) => (
                          <tr key={ration.id}>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {ration.userName}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {ration.category}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              {formatDate(ration.date)}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200">
                              <div className="flex flex-wrap gap-1">
                                {ration.items.map((item, index) => (
                                  <span key={index} className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                                    {item.name}: {item.quantity}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No ration distributions recorded yet</p>
                  </div>
                )}
              </div>
              
              {/* Transaction History */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Transaction History</h2>
                
                {txHistory.length > 0 ? (
                  <div className="overflow-y-auto max-h-80">
                    <table className="min-w-full bg-white border">
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
                            Transaction
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {txHistory.map((tx, index) => (
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
                              {tx.txHash ? (
                                <a 
                                  href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  View on Etherscan
                                </a>
                              ) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No transactions recorded yet</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Instruction Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Delivery Process Instructions */}
              <div className="bg-indigo-50 p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold text-indigo-800 mb-4">Delivery Process</h3>
                <ol className="space-y-2 text-indigo-700 list-decimal pl-5">
                  <li>
                    <span className="font-medium">Receive delivery person</span> - When a delivery person arrives, click "Receive Delivery"
                  </li>
                  <li>
                    <span className="font-medium">Verify OTP</span> - Enter the OTP provided by the delivery person
                  </li>
                  <li>
                    <span className="font-medium">Verify location</span> - Confirm the delivery person is at your depot location
                  </li>
                  <li>
                    <span className="font-medium">Complete delivery</span> - Process payment to the delivery person automatically via smart contract
                  </li>
                </ol>
              </div>
              
              {/* Ration Distribution Instructions */}
              <div className="bg-green-50 p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold text-green-800 mb-4">Ration Distribution</h3>
                <ol className="space-y-2 text-green-700 list-decimal pl-5">
                  <li>
                    <span className="font-medium">Verify beneficiary identity</span> - Check beneficiary's ID/documents
                  </li>
                  <li>
                    <span className="font-medium">Distribute ration items</span> - Provide the appropriate items based on category
                  </li>
                  <li>
                    <span className="font-medium">Record in blockchain</span> - Click "Track Ration" and enter details
                  </li>
                  <li>
                    <span className="font-medium">Update status</span> - The system will automatically update last ration date for the beneficiary
                  </li>
                </ol>
              </div>
            </div>
            
            {/* Beneficiary Ration Input Form */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Record New Ration Distribution</h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const beneficiaryId = formData.get('beneficiaryId');
                const items = [
                  { name: 'Rice', quantity: formData.get('riceQty') },
                  { name: 'Wheat', quantity: formData.get('wheatQty') },
                  { name: 'Sugar', quantity: formData.get('sugarQty') },
                  { name: 'Oil', quantity: formData.get('oilQty') }
                ].filter(item => item.quantity);
                
                trackRationDistribution(beneficiaryId, items);
                e.target.reset();
              }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="beneficiaryId">
                      Select Beneficiary
                    </label>
                    <select 
                      id="beneficiaryId"
                      name="beneficiaryId"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    >
                      <option value="">Choose a beneficiary</option>
                      {assignedUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} (ID: {user.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="riceQty">
                      Rice
                    </label>
                    <input
                      type="text"
                      id="riceQty"
                      name="riceQty"
                      placeholder="e.g., 5kg"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="wheatQty">
                      Wheat
                    </label>
                    <input
                      type="text"
                      id="wheatQty"
                      name="wheatQty"
                      placeholder="e.g., 3kg"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sugarQty">
                      Sugar
                    </label>
                    <input
                      type="text"
                      id="sugarQty"
                      name="sugarQty"
                      placeholder="e.g., 1kg"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="oilQty">
                      Oil
                    </label>
                    <input
                      type="text"
                      id="oilQty"
                      name="oilQty"
                      placeholder="e.g., 1L"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Record Distribution
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </DepotLayout>
  );
}