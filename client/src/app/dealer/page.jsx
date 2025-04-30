'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import { ethers } from 'ethers';
import { getContract } from '@/utils/contract';
import DealerLayout from '@/components/DealerLayout';

export default function DeliveryPersonDashboard() {
  // Replace useSDK with useMetaMask
  const { connected, provider, account } = useMetaMask();  
  const router = useRouter();
  
  // Delivery person details
  const [deliveryPersonId, setDeliveryPersonId] = useState('');
  const [deliveryPersonName, setDeliveryPersonName] = useState('');
  const [assignedDepots, setAssignedDepots] = useState([]);
  const [activeDepot, setActiveDepot] = useState(null);
  
  // Delivery status
  const [currentDelivery, setCurrentDelivery] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  
  // OTP verification
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  
  // Location verification
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Ration distribution
  const [usersInDepot, setUsersInDepot] = useState([]);
  const [allocatingRation, setAllocatingRation] = useState(false);
  const [rationSuccess, setRationSuccess] = useState('');
  const [rationError, setRationError] = useState('');
  
  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txHistory, setTxHistory] = useState([]);
  const [enteredOtp, setEnteredOtp] = useState('');
  
  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('rationchain-delivery-tx-history');
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
      localStorage.setItem('rationchain-delivery-tx-history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save transaction history:', e);
    }
  };
  
  // Initialize and fetch delivery person data
  useEffect(() => {    
    if (!connected || !provider) {
      router.push('/');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        // Updated to use ethers with the custom provider
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        const signerAddress = await signer.getAddress();
        
        console.log("Connected with address:", signerAddress);
        
        // Find delivery person by wallet address
        const deliveryPersonCount = await contract.deliveryPersonCount();
        
        for (let i = 1; i <= Number(deliveryPersonCount); i++) {
          try {
            const person = await contract.getDeliveryPersonDetails(i);
            
            if (person.walletAddress.toLowerCase() === signerAddress.toLowerCase()) {
              setDeliveryPersonId(String(person.id));
              setDeliveryPersonName(person.name);
              
              // Get assigned depots
              const depotPromises = [];
              for (let j = 0; j < person.assignedDepotIds.length; j++) {
                const depotId = String(person.assignedDepotIds[j]);
                if (depotId !== '0') {
                  depotPromises.push(contract.getDepotDetails(depotId));
                }
              }
              
              const depotResults = await Promise.all(depotPromises);
              const depotData = depotResults.map(depot => ({
                id: String(depot.id),
                name: depot.name,
                location: depot.location,
                walletAddress: depot.walletAddress
              }));
              
              setAssignedDepots(depotData);
              
              // After setting assigned depots, then fetch deliveries
              console.log(`Fetching deliveries for delivery person ID: ${String(person.id)}`);
              await fetchDeliveries(contract, String(person.id));
              break;
            }
          } catch (error) {
            console.error(`Error checking delivery person ${i}:`, error);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching delivery person data:', error);
        setError('Failed to load your data from blockchain: ' + (error.message || error.toString()));
        setLoading(false);
      }
    };
    
    fetchData();
  }, [connected, provider, router]);
  
  // Fetch deliveries for this delivery person
  const fetchDeliveries = async (contract, deliveryPersonId) => {
    try {
      const pendingDeliveriesData = [];
      const completedDeliveriesData = [];
      
      console.log("Fetching deliveries for delivery person ID:", deliveryPersonId);
      
      // Get the total delivery count from the contract
      const deliveryCount = await contract.rationDeliveryCount();
      console.log(`Total deliveries in contract: ${deliveryCount}`);
      
      // Log all deliveries for debugging
      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);
          console.log(`Delivery #${i}:`);
          console.log(`- Delivery Person ID: ${delivery.deliveryPersonId.toString()}`);
          console.log(`- Depot ID: ${delivery.depotId.toString()}`);
          console.log(`- User ID: ${delivery.userId.toString()}`);
          console.log(`- Status: ${delivery.status.toString()}`);
          console.log(`- Amount: ${ethers.formatEther(delivery.amount)} ETH`);
        } catch (err) {
          console.error(`Error checking delivery ${i}:`, err);
        }
      }
      
      // Now filter deliveries for this delivery person
      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);
          
          // Convert to string for safe comparison
          const deliveryPersonIdStr = delivery.deliveryPersonId.toString();
          
          // Check if this delivery is assigned to this delivery person
          if (deliveryPersonIdStr === deliveryPersonId) {
            console.log(`Found delivery #${i} for delivery person ${deliveryPersonId}`);
            
            try {
              // Get depot details for this delivery
              const depotDetails = await contract.getDepotDetails(delivery.depotId);
              
              const deliveryData = {
                id: i.toString(),
                deliveryId: i.toString(),
                depotId: delivery.depotId.toString(),
                depotName: depotDetails.name,
                userId: delivery.userId.toString(),
                status: Number(delivery.status) === 2 ? 'completed' : 'pending',
                date: new Date(Number(delivery.createdAt) * 1000).toISOString(),
                amount: ethers.formatEther(delivery.amount),
                users: [] // Placeholder for users in depot
              };
              
              // Sort by status
              if (Number(delivery.status) === 2) { // DELIVERED
                completedDeliveriesData.push(deliveryData);
              } else { // PENDING or IN_TRANSIT
                pendingDeliveriesData.push(deliveryData);
              }
            } catch (depotError) {
              console.error(`Error fetching depot details for delivery ${i}:`, depotError);
            }
          }
        } catch (error) {
          console.error(`Error fetching delivery ${i}:`, error);
        }
      }
      
      console.log(`Found ${pendingDeliveriesData.length} pending deliveries and ${completedDeliveriesData.length} completed deliveries`);
      
      setPendingDeliveries(pendingDeliveriesData);
      setCompletedDeliveries(completedDeliveriesData);
      
      return {
        pending: pendingDeliveriesData,
        completed: completedDeliveriesData
      };
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError(`Failed to fetch deliveries: ${error.message || error}`);
      return {
        pending: [],
        completed: []
      };
    }
  };

  // Start delivery function
  const startDelivery = async (depotId) => {
    try {
      console.log(`Starting delivery for depot ID: ${depotId}`);
      console.log(`Current delivery person ID: ${deliveryPersonId}`);
      
      const selectedDepot = assignedDepots.find(depot => depot.id === depotId);
      
      if (!selectedDepot) {
        setError('Selected depot not found in your assigned depots');
        return;
      }
      
      setActiveDepot(selectedDepot);
      
      // Get ethers provider using custom MetaMask provider
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // First, refresh the deliveries data to make sure we have the latest
      const deliveries = await fetchDeliveries(contract, deliveryPersonId);
      
      // Find a pending delivery for this depot
      const pendingDelivery = deliveries.pending.find(
        delivery => delivery.depotId === depotId
      );
      
      if (!pendingDelivery) {
        console.log(`No pending deliveries found for depot ${depotId}`);
        alert("No active deliveries found for this depot. Please contact the administrator to allocate a ration delivery.");
        setError("No active deliveries found. Please contact admin to create a delivery for this depot.");
        return;
      }
      
      console.log("Found pending delivery:", pendingDelivery);
      
      // Fetch users for this depot
      const users = await fetchUsersForDepot(depotId);
      
      // Get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            setLocationError('Unable to get your current location. Please enable location services.');
          }
        );
      } else {
        setLocationError('Geolocation is not supported by your browser');
      }
      
      // Set current delivery
      setCurrentDelivery({
        deliveryId: pendingDelivery.id,
        depotId: depotId,
        depotName: selectedDepot.name,
        status: 'in-progress',
        date: new Date().toISOString(),
        users: users
      });
      
      // Record transaction in history without actual blockchain transaction
      saveTransaction({
        type: 'Begin Delivery Process',
        txHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock transaction hash
        timestamp: Date.now(),
        details: `Started delivery process to Depot ID: ${depotId}`
      });
      
      console.log("Delivery process started successfully");
      
    } catch (error) {
      console.error('Error starting delivery:', error);
      setError(`Failed to start delivery: ${error.message || error.toString()}`);
    }
  };
  
  // Fetch users for a specific depot
  const fetchUsersForDepot = async (depotId) => {
    try {
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
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
              assignedDepotId: String(user.assignedDepotId)
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${i}:`, error);
        }
      }
      
      setUsersInDepot(usersData);
      return usersData;
    } catch (error) {
      console.error('Error fetching users for depot:', error);
      return [];
    }
  };
  
  // Verify OTP function
  const verifyOTP = async () => {
    try {
      setVerifyingOtp(true);
      setOtpError('');
      setOtpSuccess('');
      
      if (!currentDelivery || !activeDepot) {
        setOtpError('No active delivery found');
        setVerifyingOtp(false);
        return;
      }
      
      // Ensure we're using the entered OTP from the depot
      if (!enteredOtp) {
        setOtpError('Please enter the OTP provided by the depot');
        setVerifyingOtp(false);
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      console.log(`Verifying OTP: ${enteredOtp} for delivery ID: ${currentDelivery.deliveryId}`);
      
      // Call contract to verify OTP with the entered OTP from depot
      const verifyTx = await contract.verifyOTP(
        currentDelivery.deliveryId,
        enteredOtp.trim() // Trim any whitespace
      );
      
      await verifyTx.wait();
      
      saveTransaction({
        type: 'Verify OTP',
        txHash: verifyTx.hash,
        timestamp: Date.now(),
        details: `OTP verified at Depot ID: ${activeDepot.id}`
      });
      
      setOtpSuccess('OTP verified successfully! Please proceed with location verification.');
      
      // After OTP verification, we check location
      await verifyLocation();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // Extract specific error message
      let errorMessage = error.message || String(error);
      if (errorMessage.includes("OTP does not match")) {
        setOtpError('The OTP you entered does not match. Please check with the depot for the correct OTP.');
      } else {
        setOtpError('Failed to verify OTP: ' + errorMessage);
      }
    } finally {
      setVerifyingOtp(false);
    }
  };
  
  // Verify location
  const verifyLocation = async () => {
    try {
      setVerifyingLocation(true);
      setLocationError('');
      setLocationSuccess('');
      
      if (!currentLocation) {
        setLocationError('No location data available');
        return;
      }
      
      if (!currentDelivery || !activeDepot) {
        setLocationError('No active delivery found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Call contract to verify location
      const locVerifyTx = await contract.verifyLocation(
        activeDepot.id,
        currentLocation.latitude.toString(),
        currentLocation.longitude.toString(),
        deliveryPersonId
      );
      await locVerifyTx.wait();
      
      saveTransaction({
        type: 'Verify Location',
        txHash: locVerifyTx.hash,
        timestamp: Date.now(),
        details: `Location verified at Depot ID: ${activeDepot.id}`
      });
      
      setLocationSuccess('Location verified successfully! You can now proceed with ration distribution.');
      
      // Update delivery status
      const updatedDelivery = {...currentDelivery, status: 'authenticated'};
      setCurrentDelivery(updatedDelivery);
    } catch (error) {
      console.error('Error verifying location:', error);
      setLocationError('Failed to verify location: ' + (error.message || error.toString()));
    } finally {
      setVerifyingLocation(false);
    }
  };
  
  // Allocate ration to a user
  const allocateRation = async (userId) => {
    try {
      setAllocatingRation(true);
      setRationError('');
      setRationSuccess('');
      
      if (!currentDelivery || !activeDepot) {
        setRationError('No active delivery found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Call contract to allocate ration
      const allocateTx = await contract.allocateRation(
        userId,
        activeDepot.id,
        deliveryPersonId
      );
      await allocateTx.wait();
      
      saveTransaction({
        type: 'Allocate Ration',
        txHash: allocateTx.hash,
        timestamp: Date.now(),
        details: `Ration allocated to User ID: ${userId} at Depot ID: ${activeDepot.id}`
      });
      
      setRationSuccess(`Ration allocated successfully to user ${userId}!`);
      
      // Update users in depot
      const updatedUsers = usersInDepot.map(user => {
        if (user.id === userId) {
          return {...user, rationAllocated: true};
        }
        return user;
      });
      
      setUsersInDepot(updatedUsers);
    } catch (error) {
      console.error('Error allocating ration:', error);
      setRationError('Failed to allocate ration: ' + (error.message || error.toString()));
    } finally {
      setAllocatingRation(false);
    }
  };
  
  // Complete delivery
  const completeDelivery = async () => {
    try {
      if (!currentDelivery || !activeDepot) {
        setError('No active delivery found');
        return;
      }
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Call contract to complete delivery
      const completeTx = await contract.completeDelivery(
        activeDepot.id,
        deliveryPersonId
      );
      await completeTx.wait();
      
      saveTransaction({
        type: 'Complete Delivery',
        txHash: completeTx.hash,
        timestamp: Date.now(),
        details: `Delivery completed at Depot ID: ${activeDepot.id}`
      });
      
      // Update delivery status
      const completedDelivery = {
        ...currentDelivery, 
        status: 'completed',
        users: currentDelivery.users || [] // Ensure users is always defined
      };
      setCompletedDeliveries([completedDelivery, ...completedDeliveries]);
      
      // Reset current delivery
      setCurrentDelivery(null);
      setActiveDepot(null);
      setUsersInDepot([]);
      setOtp('');
      setOtpSuccess('');
      setLocationSuccess('');
      setRationSuccess('');
      
      alert('Delivery completed successfully! Funds have been transferred to your account.');
    } catch (error) {
      console.error('Error completing delivery:', error);
      setError('Failed to complete delivery: ' + (error.message || error.toString()));
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Check if all users have received rations
  const allUsersServed = () => {
    if (!usersInDepot.length) return false;
    return usersInDepot.every(user => user.rationAllocated);
  };

  // Add a debug button to force refresh data
  const forceRefresh = async () => {
    try {
      setLoading(true);
      setError('');
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      console.log("Force refreshing delivery data for ID:", deliveryPersonId);
      await fetchDeliveries(contract, deliveryPersonId);
      
      setLoading(false);
      alert("Data refreshed successfully. Check browser console for delivery details.");
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data: " + error.message);
      setLoading(false);
    }
  };
  
  return (
    <DealerLayout>
      <Head>
        <title>Delivery Person Dashboard | RationChain</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Delivery Person Dashboard</h1>
            {!loading && deliveryPersonName && (
              <p className="text-lg text-gray-600">Welcome, {deliveryPersonName}</p>
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
            {currentDelivery ? (
              // Active delivery section
              <div className="grid grid-cols-1 gap-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Active Delivery</h2>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                      {currentDelivery.status === 'authenticated' ? 'Authenticated' : 'In Progress'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-gray-600 mb-2">Depot Name:</p>
                      <p className="font-medium">{currentDelivery.depotName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-2">Start Time:</p>
                      <p className="font-medium">{formatDate(currentDelivery.date)}</p>
                    </div>
                  </div>
                  
                  {/* Important Notice for Delivery Person */}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                    <h3 className="text-lg font-bold text-yellow-800 mb-2">Delivery Process Instructions:</h3>
                    <ol className="list-decimal list-inside text-yellow-700 space-y-2">
                      <li><span className="font-semibold">Go to the depot</span> and inform them you've arrived for delivery</li>
                      <li><span className="font-semibold">Ask the depot manager to generate an OTP</span> for verification</li>
                      <li><span className="font-semibold">Enter that OTP</span> in the form below to verify your identity</li>
                      <li>Complete location verification and ration distribution</li>
                    </ol>
                  </div>
                  
                  {/* OTP Verification Section */}
                  {currentDelivery.status !== 'authenticated' && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold mb-4">Depot Authentication</h3>
                      
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
                      
                      <div className="mb-4">
                        <p className="text-gray-600 mb-2">Enter OTP from Depot:</p>
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="flex-1 p-2 border border-gray-300 rounded mr-2"
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value)}
                            placeholder="Enter the OTP shown by depot"
                          />
                          <button
                            onClick={verifyOTP}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={verifyingOtp || !enteredOtp}
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                          </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-semibold text-red-600">IMPORTANT:</p>
                          <p>1. The depot manager MUST generate an OTP first</p>
                          <p>2. This sets the delivery status to "In Transit" in the system</p>
                          <p>3. Then you can enter and verify that OTP here</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Location Verification Section */}
                  {currentDelivery.status !== 'authenticated' && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold mb-4">Location Verification</h3>
                      
                      {locationError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                          {locationError}
                        </div>
                      )}
                      
                      {locationSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                          {locationSuccess}
                        </div>
                      )}
                      
                      {currentLocation ? (
                        <div className="mb-4">
                          <p className="text-gray-600 mb-2">Your Current Location:</p>
                          <div className="bg-blue-50 px-4 py-2 rounded border border-blue-200">
                            <p>Latitude: {currentLocation.latitude}</p>
                            <p>Longitude: {currentLocation.longitude}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-gray-600">Fetching your location...</p>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <button
                          onClick={verifyLocation}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                          disabled={verifyingLocation || !currentLocation}
                        >
                          {verifyingLocation ? 'Verifying...' : 'Verify Location'}
                        </button>
                        <p className="ml-4 text-sm text-gray-600">
                          Click to verify your location with the depot
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Ration Distribution Section */}
                  {currentDelivery.status === 'authenticated' && (
                    <div className="bg-white border rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold mb-4">Ration Distribution</h3>
                      
                      {rationError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                          {rationError}
                        </div>
                      )}
                      
                      {rationSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                          {rationSuccess}
                        </div>
                      )}
                      
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
                                Status
                              </th>
                              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersInDepot.length > 0 ? (
                              usersInDepot.map((user) => (
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
                                    {user.rationAllocated ? (
                                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                        Allocated
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 border-b border-gray-200">
                                    <button
                                      onClick={() => allocateRation(user.id)}
                                      className={`px-3 py-1 rounded ${
                                        user.rationAllocated
                                          ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                                          : 'bg-green-500 hover:bg-green-700 text-white'
                                      }`}
                                      disabled={user.rationAllocated || allocatingRation}
                                    >
                                      {user.rationAllocated ? 'Allocated' : 'Allocate Ration'}
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
                  )}
                  
                  {/* Complete Delivery Button */}
                  {currentDelivery.status === 'authenticated' && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={completeDelivery}
                        className={`px-6 py-3 rounded text-white font-bold ${
                          allUsersServed() 
                            ? 'bg-green-500 hover:bg-green-700' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!allUsersServed()}
                      >
                        Complete Delivery
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Start delivery section
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Assigned Depots Section */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Your Assigned Depots</h2>
                  
                  {assignedDepots.length > 0 ? (
                    <div className="space-y-4">
                      {assignedDepots.map((depot) => (
                        <div key={depot.id} className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="font-bold">{depot.name}</h3>
                          <p className="text-gray-600 text-sm mb-2">{depot.location}</p>
                          <button
                            onClick={() => startDelivery(depot.id)}
                            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white py-1 px-4 rounded"
                          >
                            Start Delivery
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-gray-600">You don't have any assigned depots yet</p>
                    </div>
                  )}
                </div>
                
                {/* Pending Deliveries Section */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Pending Deliveries</h2>
                  
                  {pendingDeliveries.length > 0 ? (
                    <div className="space-y-4">
                      {pendingDeliveries.map((delivery) => (
                        <div key={delivery.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold">{delivery.depotName}</h3>
                              <p className="text-gray-600 text-sm">Scheduled: {formatDate(delivery.date)}</p>
                            </div>
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <button
                            onClick={() => startDelivery(delivery.depotId)}
                            className="mt-3 bg-blue-500 hover:bg-blue-700 text-white py-1 px-4 rounded"
                          >
                            Start Delivery
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
              </div>
            )}
            
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
            
            {/* Completed Deliveries Section */}
            {completedDeliveries.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 mt-8">
                <h2 className="text-xl font-bold mb-4">Completed Deliveries</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Depot
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Users Served
                        </th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedDeliveries.map((delivery, index) => (
                        <tr key={index}>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {delivery.depotName}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            {formatDate(delivery.date)}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                          {delivery.users && delivery.users.length || "All"}
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
              </div>
            )}
          </>
        )}
      </div>
    </DealerLayout>
  );
}