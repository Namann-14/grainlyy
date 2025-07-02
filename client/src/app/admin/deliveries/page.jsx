// "use client";
// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { Badge } from '@/components/ui/badge';
// import AdminLayout from '@/components/AdminLayout';
// import { Truck, UserCheck, UserX, Clock } from 'lucide-react';
// import { ethers } from "ethers";
// import RegistrationFaucetABI from "../../../../abis/RegistrationFaucet.json";
// import DashboardFaucetABI from "../../../../abis/DashboardFaucet.json";

// // IMPORTANT: Use your Diamond Proxy address here!
// const DASHBOARD_DIAMOND_ADDRESS = "0x46a92d404A83304249e1A51695994DF7Fc51Dc35"; // <-- CHANGE THIS!
// const REGISTRATION_FAUCET_ADDRESS = "0xBd5F4cD4df0e9e77904a717ea2139779DA538d17";

// const containerVariants = {
//   hidden: { opacity: 0 },
//   show: {
//     opacity: 1,
//     transition: {
//       staggerChildren: 0.1
//     }
//   }
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   show: { opacity: 1, y: 0 }
// };

// export default function DeliverySignupRequests() {
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('pending');
//   const [stats, setStats] = useState({
//     pending: 0,
//     approved: 0,
//     rejected: 0,
//     total: 0
//   });
//   const [assigning, setAssigning] = useState(false);

//   // Shopkeeper dropdown state
//   const [shopkeepers, setShopkeepers] = useState([]);
//   const [selectedShopkeepers, setSelectedShopkeepers] = useState({});

//   useEffect(() => {
//     fetchRequests();
//     fetchShopkeepersFromBlockchain();
//   }, [filter]);

//   const fetchRequests = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/delivery-signup?status=${filter}`);
//       const data = await response.json();
//       setRequests(data.requests);

//       // Calculate stats
//       const allResponse = await fetch('/api/delivery-signup?status=all');
//       const allData = await allResponse.json();
//       const allRequests = allData.requests;

//       setStats({
//         pending: allRequests.filter(r => r.status === 'pending').length,
//         approved: allRequests.filter(r => r.status === 'approved').length,
//         rejected: allRequests.filter(r => r.status === 'rejected').length,
//         total: allRequests.length
//       });
//     } catch (error) {
//       console.error('Error fetching requests:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch shopkeepers from Diamond Proxy using DashboardFaucet ABI
//   const fetchShopkeepersFromBlockchain = async () => {
//     try {
//       const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-mumbai.infura.io/v3/");
//       const contract = new ethers.Contract(
//         DASHBOARD_DIAMOND_ADDRESS,
//         DashboardFaucetABI,
//         provider
//       );
//       const addresses = await contract.getAllShopkeepers();
//       console.log("Shopkeeper addresses from blockchain:", addresses);
//       setShopkeepers(addresses.map(addr => ({ walletAddress: addr })));
//     } catch (err) {
//       setShopkeepers([]);
//       console.error("Error fetching shopkeepers from blockchain:", err);
//     }
//   };

// const handleAction = async (requestId, action, adminNote = '') => {
//   try {
//     setAssigning(true);
//     const request = requests.find(r => r._id === requestId);
//     const shopkeeperAddress = selectedShopkeepers[request._id];

//     if (action === "approve" && !shopkeeperAddress) {
//       alert("Please select a shopkeeper before approving.");
//       setAssigning(false);
//       return;
//     }
//     if (!request.walletAddress) {
//       alert("Delivery agent wallet address is missing!");
//       setAssigning(false);
//       return;
//     }

//     let txHash = null;
//     if (action === "approve") {
//       if (!window.ethereum) {
//         alert("Please install MetaMask!");
//         setAssigning(false);
//         return;
//       }
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(
//         DASHBOARD_DIAMOND_ADDRESS,
//         RegistrationFaucetABI,
//         signer
//       );
//       // Register delivery agent on-chain
//       const tx = await contract.registerDeliveryAgent(
//         request.walletAddress,
//         request.name,
//         request.phone
//       );
//       await tx.wait();
//       txHash = tx.hash;

//       // Assign delivery agent to shopkeeper (if needed)
//       const assignTx = await contract.assignDeliveryAgentToShopkeeper(
//         request.walletAddress,
//         shopkeeperAddress
//       );
//       await assignTx.wait();
//     }

//     // 2. Update DB status
//     const response = await fetch(`/api/delivery-signup/${requestId}`, {
//       method: 'PATCH',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         action,
//         adminNote,
//         adminId: '69420',
//         name: request.name,
//         phone: request.phone,
//         walletAddress: request.walletAddress,
//         shopkeeperAddress,
//         txHash
//       }),
//     });

//     if (response.ok) {
//       fetchRequests();
//       if (txHash) {
//         window.open(`https://mumbai.polygonscan.com/tx/${txHash}`, '_blank');
//       }
//     } else {
//       let errorMsg = "Failed to update request.";
//       try {
//         const data = await response.json();
//         errorMsg = data.error || errorMsg;
//       } catch (e) {
//         errorMsg = `Server error: ${response.status}`;
//       }
//       alert(errorMsg);
//     }
//   } catch (error) {
//     console.error('Error updating request:', error);
//     alert("Failed: " + error.message);
//   } finally {
//     setAssigning(false);
//   }
// };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'pending':
//         return 'bg-yellow-100 text-yellow-800';
//       case 'approved':
//         return 'bg-green-100 text-green-800';
//       case 'rejected':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const getVehicleTypeColor = (vehicleType) => {
//     switch (vehicleType) {
//       case 'bicycle':
//         return 'bg-blue-100 text-blue-800';
//       case 'motorcycle':
//         return 'bg-orange-100 text-orange-800';
//       case 'car':
//         return 'bg-purple-100 text-purple-800';
//       case 'van':
//         return 'bg-indigo-100 text-indigo-800';
//       case 'truck':
//         return 'bg-gray-100 text-gray-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   if (loading) {
//     return (
//       <AdminLayout>
//         <div className="container mx-auto p-6">
//           <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
//             <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
//             <p>Loading delivery partner signup requests...</p>
//           </div>
//         </div>
//       </AdminLayout>
//     );
//   }

//   return (
//     <AdminLayout>
//       <div className="container mx-auto p-6">
//         <div className="flex flex-col gap-2 mb-6">
//           <h1 className="text-3xl font-bold text-green-900">Delivery Partner Signup Requests</h1>
//           <p className="text-muted-foreground">
//             Review and manage delivery partner registration requests.
//           </p>
//         </div>

//         {/* Stats Overview */}
//         <motion.div
//           className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6"
//           variants={containerVariants}
//           initial="hidden"
//           animate="show"
//         >
//           <motion.div variants={itemVariants}>
//             <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
//               <div className="flex items-center justify-between pb-2">
//                 <p className="text-sm font-medium text-gray-600">Total Requests</p>
//                 <div className="rounded-full p-2 bg-blue-100">
//                   <Truck className="h-4 w-4 text-blue-600" />
//                 </div>
//               </div>
//               <div className="text-2xl font-bold">{stats.total}</div>
//             </div>
//           </motion.div>

//           <motion.div variants={itemVariants}>
//             <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
//               <div className="flex items-center justify-between pb-2">
//                 <p className="text-sm font-medium text-gray-600">Pending</p>
//                 <div className="rounded-full p-2 bg-yellow-100">
//                   <Clock className="h-4 w-4 text-yellow-600" />
//                 </div>
//               </div>
//               <div className="text-2xl font-bold">{stats.pending}</div>
//             </div>
//           </motion.div>

//           <motion.div variants={itemVariants}>
//             <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
//               <div className="flex items-center justify-between pb-2">
//                 <p className="text-sm font-medium text-gray-600">Approved</p>
//                 <div className="rounded-full p-2 bg-green-100">
//                   <UserCheck className="h-4 w-4 text-green-600" />
//                 </div>
//               </div>
//               <div className="text-2xl font-bold">{stats.approved}</div>
//             </div>
//           </motion.div>

//           <motion.div variants={itemVariants}>
//             <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
//               <div className="flex items-center justify-between pb-2">
//                 <p className="text-sm font-medium text-gray-600">Rejected</p>
//                 <div className="rounded-full p-2 bg-red-100">
//                   <UserX className="h-4 w-4 text-red-600" />
//                 </div>
//               </div>
//               <div className="text-2xl font-bold">{stats.rejected}</div>
//             </div>
//           </motion.div>
//         </motion.div>

//         {/* Filter Tabs */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="w-full">
//             <div className="bg-white border border-green-100 rounded-lg p-1 inline-flex">
//               {['pending', 'approved', 'rejected', 'all'].map((status) => (
//                 <button
//                   key={status}
//                   onClick={() => setFilter(status)}
//                   className={`px-4 py-2 rounded-md text-sm font-medium ${
//                     filter === status 
//                       ? 'bg-green-50 text-green-700' 
//                       : 'text-gray-600 hover:bg-gray-100'
//                   }`}
//                 >
//                   {status.charAt(0).toUpperCase() + status.slice(1)}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Requests List */}
//         <motion.div
//           className="space-y-4"
//           variants={containerVariants}
//           initial="hidden"
//           animate="show"
//         >
//           {requests.length === 0 ? (
//             <div className="bg-white shadow-sm rounded-lg border border-green-100 p-12 text-center">
//               <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
//               <p className="text-gray-500">No delivery partner signup requests match the current filter.</p>
//             </div>
//           ) : (
//             requests.map((request, index) => (
//               <motion.div
//                 key={request._id}
//                 variants={itemVariants}
//                 transition={{ delay: index * 0.05 }}
//               >
//                 <div className="bg-white shadow-sm rounded-lg border border-green-100 overflow-hidden">
//                   <div className="px-6 py-4 border-b border-green-100">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <h3 className="text-xl font-bold text-gray-900">{request.name}</h3>
//                         <p className="text-sm text-gray-500">
//                           Submitted on {formatDate(request.submittedAt)}
//                         </p>
//                       </div>
//                       <div className="flex gap-2">
//                         <Badge className={getVehicleTypeColor(request.vehicleType)}>
//                           {request.vehicleType}
//                         </Badge>
//                         <Badge className={getStatusColor(request.status)}>
//                           {request.status}
//                         </Badge>
//                       </div>
//                     </div>
//                   </div>
                  
//                   <div className="px-6 py-4">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                       <div className="space-y-3">
//                         <div>
//                           <p className="text-sm font-medium text-gray-600">Contact Information</p>
//                           <p className="text-sm text-gray-900">{request.phone}</p>
//                         </div>
//                         <div>
//                           <p className="text-sm font-medium text-gray-600">Address</p>
//                           <p className="text-sm text-gray-900">{request.address}</p>
//                         </div>
//                       </div>
                      
//                       <div className="space-y-3">
//                         <div>
//                           <p className="text-sm font-medium text-gray-600">Vehicle Details</p>
//                           <p className="text-sm text-gray-900">
//                             <span className="font-medium">Type:</span> {request.vehicleType}
//                           </p>
//                           <p className="text-sm text-gray-900">
//                             <span className="font-medium">License:</span> {request.licenseNumber}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
                    
//                     {request.adminNote && (
//                       <div className="mt-4 p-3 bg-gray-50 rounded-md">
//                         <p className="text-sm font-medium text-gray-600">Admin Note:</p>
//                         <p className="text-sm text-gray-900 mt-1">{request.adminNote}</p>
//                         {request.reviewedAt && (
//                           <p className="text-xs text-gray-500 mt-2">
//                             Reviewed on {formatDate(request.reviewedAt)} by {request.reviewedBy}
//                           </p>
//                         )}
//                       </div>
//                     )}
                    
//                     {request.status === 'pending' && (
//                       <div className="mt-4 pt-4 border-t border-gray-200">
//                         <div className="flex flex-col sm:flex-row gap-3 items-center">
//                           <select
//                             className="border rounded-md px-3 py-2 flex-1"
//                             value={selectedShopkeepers[request._id] || ""}
//                             onChange={e =>
//                               setSelectedShopkeepers(prev => ({
//                                 ...prev,
//                                 [request._id]: e.target.value
//                               }))
//                             }
//                           >
//                             <option value="">Select Shopkeeper</option>
//                             {shopkeepers.map(sk => (
//                               <option key={sk.walletAddress} value={sk.walletAddress}>
//                                 {sk.walletAddress}
//                               </option>
//                             ))}
//                           </select>
//                           <button
//                             onClick={() => handleAction(request._id, 'approve')}
//                             className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
//                             disabled={assigning}
//                           >
//                             {assigning ? "Processing..." : "Approve Request"}
//                           </button>
//                           <button
//                             onClick={() => handleAction(request._id, 'reject')}
//                             className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
//                             disabled={assigning}
//                           >
//                             Reject Request
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </motion.div>
//             ))
//           )}
//         </motion.div>

//         {/* Pagination */}
//         {requests.length > 0 && (
//           <div className="mt-6 bg-white shadow-sm rounded-lg border border-green-100 px-6 py-4 flex justify-between">
//             <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
//               Previous
//             </button>
//             <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
//               Next
//             </button>
//           </div>
//         )}
//       </div>
//     </AdminLayout>
//   );
// }


"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/AdminLayout';
import { Truck, UserCheck, UserX, Clock } from 'lucide-react';
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

// Use the Diamond Proxy address from .env
const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

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

export default function DeliverySignupRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [assigning, setAssigning] = useState(false);

  // Shopkeeper dropdown state
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedShopkeepers, setSelectedShopkeepers] = useState({});

  useEffect(() => {
    fetchRequests();
    fetchShopkeepersFromBlockchain();
    // eslint-disable-next-line
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/delivery-signup?status=${filter}`);
      const data = await response.json();
      setRequests(data.requests);

      // Calculate stats
      const allResponse = await fetch('/api/delivery-signup?status=all');
      const allData = await allResponse.json();
      const allRequests = allData.requests;

      setStats({
        pending: allRequests.filter(r => r.status === 'pending').length,
        approved: allRequests.filter(r => r.status === 'approved').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length,
        total: allRequests.length
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch shopkeepers from Diamond Proxy using merged ABI
  const fetchShopkeepersFromBlockchain = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        DIAMOND_PROXY_ADDRESS,
        DiamondMergedABI,
        provider
      );
      const addresses = await contract.getAllShopkeepers();
      setShopkeepers(addresses.map(addr => ({ walletAddress: addr })));
    } catch (err) {
      setShopkeepers([]);
      console.error("Error fetching shopkeepers from blockchain:", err);
    }
  };

  const handleAction = async (requestId, action, adminNote = '') => {
    try {
      setAssigning(true);
      const request = requests.find(r => r._id === requestId);
      const shopkeeperAddress = selectedShopkeepers[request._id];

      if (action === "approve" && !shopkeeperAddress) {
        alert("Please select a shopkeeper before approving.");
        setAssigning(false);
        return;
      }
      if (!request.walletAddress) {
        alert("Delivery agent wallet address is missing!");
        setAssigning(false);
        return;
      }

      let txHash = null;
      if (action === "approve") {
        if (!window.ethereum) {
          alert("Please install MetaMask!");
          setAssigning(false);
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          DIAMOND_PROXY_ADDRESS,
          DiamondMergedABI,
          signer
        );
        // Register delivery agent on-chain
        const tx = await contract.registerDeliveryAgent(
          request.walletAddress,
          request.name,
          request.phone
        );
        await tx.wait();
        txHash = tx.hash;

        // Assign delivery agent to shopkeeper (if needed)
        const assignTx = await contract.assignDeliveryAgentToShopkeeper(
          request.walletAddress,
          shopkeeperAddress
        );
        await assignTx.wait();
      }

      // 2. Update DB status
      const response = await fetch(`/api/delivery-signup/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNote,
          adminId: '69420',
          name: request.name,
          phone: request.phone,
          walletAddress: request.walletAddress,
          shopkeeperAddress,
          txHash
        }),
      });

      if (response.ok) {
        fetchRequests();
        if (txHash) {
          window.open(`https://amoy.polygonscan.com/tx/${txHash}`, '_blank');
        }
      } else {
        let errorMsg = "Failed to update request.";
        try {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        } catch (e) {
          errorMsg = `Server error: ${response.status}`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert("Failed: " + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleTypeColor = (vehicleType) => {
    switch (vehicleType) {
      case 'bicycle':
        return 'bg-blue-100 text-blue-800';
      case 'motorcycle':
        return 'bg-orange-100 text-orange-800';
      case 'car':
        return 'bg-purple-100 text-purple-800';
      case 'van':
        return 'bg-indigo-100 text-indigo-800';
      case 'truck':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading delivery partner signup requests...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Delivery Partner Signup Requests</h1>
          <p className="text-muted-foreground">
            Review and manage delivery partner registration requests.
          </p>
        </div>

        {/* Stats Overview */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <div className="rounded-full p-2 bg-blue-100">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <div className="rounded-full p-2 bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <div className="rounded-full p-2 bg-green-100">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <div className="rounded-full p-2 bg-red-100">
                  <UserX className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-full">
            <div className="bg-white border border-green-100 rounded-lg p-1 inline-flex">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === status 
                      ? 'bg-green-50 text-green-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {requests.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-green-100 p-12 text-center">
              <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">No delivery partner signup requests match the current filter.</p>
            </div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request._id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bg-white shadow-sm rounded-lg border border-green-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-green-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{request.name}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted on {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getVehicleTypeColor(request.vehicleType)}>
                          {request.vehicleType}
                        </Badge>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Contact Information</p>
                          <p className="text-sm text-gray-900">{request.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Address</p>
                          <p className="text-sm text-gray-900">{request.address}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Vehicle Details</p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Type:</span> {request.vehicleType}
                          </p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">License:</span> {request.licenseNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {request.adminNote && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-600">Admin Note:</p>
                        <p className="text-sm text-gray-900 mt-1">{request.adminNote}</p>
                        {request.reviewedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed on {formatDate(request.reviewedAt)} by {request.reviewedBy}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <select
                            className="border rounded-md px-3 py-2 flex-1"
                            value={selectedShopkeepers[request._id] || ""}
                            onChange={e =>
                              setSelectedShopkeepers(prev => ({
                                ...prev,
                                [request._id]: e.target.value
                              }))
                            }
                          >
                            <option value="">Select Shopkeeper</option>
                            {shopkeepers.map(sk => (
                              <option key={sk.walletAddress} value={sk.walletAddress}>
                                {sk.walletAddress}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAction(request._id, 'approve')}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                            disabled={assigning}
                          >
                            {assigning ? "Processing..." : "Approve Request"}
                          </button>
                          <button
                            onClick={() => handleAction(request._id, 'reject')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                            disabled={assigning}
                          >
                            Reject Request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination */}
        {requests.length > 0 && (
          <div className="mt-6 bg-white shadow-sm rounded-lg border border-green-100 px-6 py-4 flex justify-between">
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}