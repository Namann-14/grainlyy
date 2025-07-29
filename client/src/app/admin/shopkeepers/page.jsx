'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import AdminLayout from '@/components/AdminLayout';
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Building, Filter, Plus, RefreshCw, MapPin, Users, Package,
  CheckCircle2, AlertCircle, DollarSign, Truck, Clock, Activity,
  Eye, Settings, CreditCard, FileText, BarChart3
} from "lucide-react";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export default function ShopkeeperManagement() {
  const router = useRouter();
  
  // Core states
  const [shopkeepers, setShopkeepers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Detailed view states
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [shopkeeperDetails, setShopkeeperDetails] = useState(null);
  const [shopkeeperTokens, setShopkeeperTokens] = useState([]);
  const [shopkeeperPayments, setShopkeeperPayments] = useState([]);
  const [shopkeeperMetrics, setShopkeeperMetrics] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [assignedAgent, setAssignedAgent] = useState(null);
  
  // Action states
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllShopkeepers();
  }, []);

  // Fetch all shopkeepers from blockchain
  const fetchAllShopkeepers = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      console.log("🏪 Fetching all shopkeepers from blockchain...");
      
      // Get total shopkeeper count
      const shopkeeperCount = await contract.getShopkeeperCount();
      console.log("📊 Total shopkeepers:", Number(shopkeeperCount));
      
      if (Number(shopkeeperCount) === 0) {
        setShopkeepers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fetch all shopkeeper addresses
      const shopkeeperAddresses = [];
      for (let i = 0; i < Number(shopkeeperCount); i++) {
        try {
          const address = await contract.getShopkeeperByIndex(i);
          if (address && address !== ethers.ZeroAddress) {
            shopkeeperAddresses.push(address);
          }
        } catch (e) {
          console.log(`⚠️ Could not fetch shopkeeper at index ${i}`);
        }
      }
      
      console.log("📋 Found shopkeeper addresses:", shopkeeperAddresses.length);
      
      // Fetch detailed information for each shopkeeper
      const shopkeeperData = await Promise.all(
        shopkeeperAddresses.map(async (address) => {
          try {
            // Get basic shopkeeper info
            const shopkeeperInfo = await contract.getShopkeeperInfo(address);
            
            // Get dashboard data
            const dashboard = await contract.getShopkeeperDashboard(address);
            
            // Get performance metrics
            const metrics = await contract.getShopkeeperPerformanceMetrics(address);
            
            return {
              shopkeeperAddress: address,
              name: shopkeeperInfo.name || 'Unknown',
              area: shopkeeperInfo.area || 'Unknown',
              isActive: shopkeeperInfo.isActive || false,
              registrationTime: Number(shopkeeperInfo.registrationTime) || 0,
              // Dashboard data
              totalConsumersAssigned: Number(dashboard.totalConsumersAssigned) || 0,
              currentMonthTokensIssued: Number(dashboard.currentMonthTokensIssued) || 0,
              currentMonthDeliveries: Number(dashboard.currentMonthDeliveries) || 0,
              totalEarnings: dashboard.totalEarnings ? ethers.formatEther(dashboard.totalEarnings) : '0',
              // Performance metrics
              activeConsumers: Number(metrics.activeConsumers) || 0,
              pendingDeliveries: Number(metrics.pendingDeliveries) || 0,
              overdueDeliveries: Number(metrics.overdueDeliveries) || 0,
              deliverySuccessRate: Number(metrics.deliverySuccessRate) || 0,
              totalTokensIssued: Number(metrics.currentMonthTokensIssued) || 0,
              totalDeliveries: Number(metrics.currentMonthDeliveries) || 0
            };
          } catch (error) {
            console.error(`❌ Error fetching data for shopkeeper ${address}:`, error);
            return {
              shopkeeperAddress: address,
              name: 'Error loading',
              area: 'Unknown',
              isActive: false,
              registrationTime: 0,
              totalConsumersAssigned: 0,
              currentMonthTokensIssued: 0,
              currentMonthDeliveries: 0,
              totalEarnings: '0',
              activeConsumers: 0,
              pendingDeliveries: 0,
              overdueDeliveries: 0,
              deliverySuccessRate: 0,
              totalTokensIssued: 0,
              totalDeliveries: 0
            };
          }
        })
      );
      
      setShopkeepers(shopkeeperData);
      console.log("✅ Successfully loaded", shopkeeperData.length, "shopkeepers");
      
    } catch (error) {
      console.error('❌ Error fetching shopkeepers:', error);
      setError('Failed to fetch shopkeepers from blockchain: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch detailed shopkeeper information
  const fetchShopkeeperDetails = async (shopkeeperAddress) => {
    try {
      setProcessingAction(true);
      setError('');
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      console.log("🔍 Fetching details for shopkeeper:", shopkeeperAddress);
      
      // Fetch all required data in parallel
      const [
        dashboard,
        tokens,
        payments,
        paymentSummary,
        metrics,
        pendingDeliveriesData,
        assignedAgentData
      ] = await Promise.all([
        contract.getShopkeeperDashboard(shopkeeperAddress),
        contract.getTokensForShopkeeper(shopkeeperAddress),
        contract.getShopkeeperPayments(shopkeeperAddress),
        contract.getShopkeeperPaymentSummary(shopkeeperAddress),
        contract.getShopkeeperPerformanceMetrics(shopkeeperAddress),
        contract.getPendingDeliveriesForShopkeeper(shopkeeperAddress),
        contract.getAssignedDeliveryAgent(shopkeeperAddress).catch(() => [null, false])
      ]);
      
      // Set dashboard details
      setShopkeeperDetails(dashboard);
      
      // Set tokens
      setShopkeeperTokens(tokens || []);
      
      // Set payments
      setShopkeeperPayments(payments || []);
      
      // Set metrics
      setShopkeeperMetrics(metrics);
      
      // Set pending deliveries
      const [tokenIds, aadhaars, names, amounts, expiryTimes] = pendingDeliveriesData;
      if (tokenIds && tokenIds.length > 0) {
        const formattedDeliveries = tokenIds.map((tokenId, index) => ({
          tokenId: tokenId.toString(),
          aadhaar: aadhaars[index].toString(),
          consumerName: names[index] || 'Unknown',
          rationAmount: amounts[index].toString(),
          expiryTime: Number(expiryTimes[index])
        }));
        setPendingDeliveries(formattedDeliveries);
      } else {
        setPendingDeliveries([]);
      }
      
      // Set assigned delivery agent
      const [agent, hasAgent] = assignedAgentData;
      if (hasAgent && agent) {
        setAssignedAgent(agent);
      } else {
        setAssignedAgent(null);
      }
      
      console.log("✅ Shopkeeper details loaded successfully");
      
    } catch (error) {
      console.error('❌ Error fetching shopkeeper details:', error);
      setError('Failed to fetch shopkeeper details: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Mark delivery as completed (admin action)
  const markDeliveryCompleted = async (aadhaar, tokenId) => {
    try {
      setProcessingAction(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);
      
      console.log("📦 Marking delivery as completed for:", { aadhaar, tokenId });
      
      const tx = await contract.markRationDeliveredByAadhaar(aadhaar, tokenId);
      console.log("📤 Transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("✅ Delivery marked as completed");
      
      setSuccess(`Delivery for token ${tokenId} marked as completed successfully`);
      
      // Refresh the shopkeeper details
      if (selectedShopkeeper) {
        await fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress);
      }
      
    } catch (error) {
      console.error('❌ Error marking delivery:', error);
      setError('Failed to mark delivery: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk mark deliveries
  const bulkMarkDeliveries = async (deliveries) => {
    try {
      setProcessingAction(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);
      
      const aadhaars = deliveries.map(d => d.aadhaar);
      const tokenIds = deliveries.map(d => d.tokenId);
      
      console.log("📦 Bulk marking deliveries:", { aadhaars, tokenIds });
      
      const tx = await contract.bulkMarkDeliveries(aadhaars, tokenIds);
      console.log("📤 Bulk delivery transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("✅ Bulk deliveries marked as completed");
      
      setSuccess(`${deliveries.length} deliveries marked as completed successfully`);
      
      // Refresh the shopkeeper details
      if (selectedShopkeeper) {
        await fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress);
      }
      
    } catch (error) {
      console.error('❌ Error bulk marking deliveries:', error);
      setError('Failed to bulk mark deliveries: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Initiate payment for a token
  const initiatePayment = async (aadhaar, tokenId, paymentMethod = 'UPI') => {
    try {
      setProcessingAction(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);
      
      console.log("💳 Initiating payment for:", { aadhaar, tokenId, paymentMethod });
      
      const tx = await contract.initiatePayment(aadhaar, tokenId, paymentMethod);
      console.log("📤 Payment initiation transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("✅ Payment initiated successfully");
      
      setSuccess(`Payment for token ${tokenId} initiated successfully`);
      
      // Refresh the shopkeeper details
      if (selectedShopkeeper) {
        await fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress);
      }
      
    } catch (error) {
      console.error('❌ Error initiating payment:', error);
      setError('Failed to initiate payment: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Complete payment
  const completePayment = async (paymentId, upiTransactionId) => {
    try {
      setProcessingAction(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);
      
      console.log("✅ Completing payment:", { paymentId, upiTransactionId });
      
      const tx = await contract.completePayment(paymentId, upiTransactionId);
      console.log("📤 Payment completion transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("✅ Payment completed successfully");
      
      setSuccess(`Payment ${paymentId} completed successfully and token claimed`);
      
      // Refresh the shopkeeper details
      if (selectedShopkeeper) {
        await fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress);
      }
      
    } catch (error) {
      console.error('❌ Error completing payment:', error);
      setError('Failed to complete payment: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Fail payment
  const failPayment = async (paymentId, reason) => {
    try {
      setProcessingAction(true);
      setError('');
      setSuccess('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);
      
      console.log("❌ Failing payment:", { paymentId, reason });
      
      const tx = await contract.failPayment(paymentId, reason);
      console.log("📤 Payment failure transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("✅ Payment marked as failed");
      
      setSuccess(`Payment ${paymentId} marked as failed: ${reason}`);
      
      // Refresh the shopkeeper details
      if (selectedShopkeeper) {
        await fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress);
      }
      
    } catch (error) {
      console.error('❌ Error failing payment:', error);
      setError('Failed to mark payment as failed: ' + (error.reason || error.message));
    } finally {
      setProcessingAction(false);
    }
  };

  // Check if shopkeeper can mark delivery
  const canMarkDelivery = async (shopkeeperAddress, tokenId) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      const canMark = await contract.canShopkeeperMarkDelivery(shopkeeperAddress, tokenId);
      return canMark;
    } catch (error) {
      console.error('Error checking delivery permission:', error);
      return false;
    }
  };

  const filteredShopkeepers = shopkeepers.filter(shopkeeper => {
    const matchesSearch = shopkeeper.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopkeeper.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopkeeper.shopkeeperAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || shopkeeper.area === filterArea;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && shopkeeper.isActive) ||
                         (filterStatus === 'inactive' && !shopkeeper.isActive);
    return matchesSearch && matchesArea && matchesStatus;
  });

  const uniqueAreas = [...new Set(shopkeepers.map(s => s.area))].filter(Boolean);

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleTimeString('en-IN');
  };

  const getExpiryStatus = (expiryTime) => {
    const now = Date.now() / 1000;
    const daysLeft = Math.ceil((expiryTime - now) / 86400);
    
    if (daysLeft < 0) return { status: "expired", color: "destructive", text: "Expired" };
    if (daysLeft <= 2) return { status: "urgent", color: "destructive", text: `${daysLeft} days left` };
    if (daysLeft <= 5) return { status: "warning", color: "warning", text: `${daysLeft} days left` };
    return { status: "good", color: "secondary", text: `${daysLeft} days left` };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading shopkeepers data from blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900">Shopkeeper Management</h1>
              <p className="text-muted-foreground">
                Manage registered shopkeepers and their distribution activities
              </p>
            </div>
            <Button
              onClick={fetchAllShopkeepers}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
            <button 
              onClick={() => setSuccess('')}
              className="float-right text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shopkeepers</p>
                  <p className="text-2xl font-bold">{shopkeepers.length}</p>
                </div>
                <Building className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Areas</p>
                  <p className="text-2xl font-bold">{uniqueAreas.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Consumers Assigned</p>
                  <p className="text-2xl font-bold">
                    {shopkeepers.reduce((sum, s) => sum + (s.totalConsumersAssigned || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-2xl font-bold">
                    {shopkeepers.reduce((sum, s) => sum + (s.totalDeliveries || 0), 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-green-100 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, area, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 min-w-[120px]"
                  >
                    <option value="all">All Areas</option>
                    {uniqueAreas.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 min-w-[120px]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shopkeepers Table */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Registered Shopkeepers ({filteredShopkeepers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredShopkeepers.length === 0 ? (
              <div className="text-center py-8">
                <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No shopkeepers found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm || filterArea !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No shopkeepers are registered in the system yet'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-600">Shopkeeper</th>
                      <th className="text-left p-4 font-medium text-gray-600">Area</th>
                      <th className="text-left p-4 font-medium text-gray-600">Consumers</th>
                      <th className="text-left p-4 font-medium text-gray-600">Tokens Issued</th>
                      <th className="text-left p-4 font-medium text-gray-600">Deliveries</th>
                      <th className="text-left p-4 font-medium text-gray-600">Earnings</th>
                      <th className="text-left p-4 font-medium text-gray-600">Success Rate</th>
                      <th className="text-left p-4 font-medium text-gray-600">Status</th>
                      <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShopkeepers.map((shopkeeper, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{shopkeeper.name}</p>
                            <p className="text-sm text-gray-500">
                              {shopkeeper.shopkeeperAddress.slice(0, 10)}...{shopkeeper.shopkeeperAddress.slice(-8)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Registered: {formatDate(shopkeeper.registrationTime)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {shopkeeper.area}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{shopkeeper.totalConsumersAssigned}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Active: {shopkeeper.activeConsumers}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Package className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{shopkeeper.totalTokensIssued}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              This month: {shopkeeper.currentMonthTokensIssued}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Truck className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">{shopkeeper.totalDeliveries}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="text-amber-600">Pending: {shopkeeper.pendingDeliveries}</span>
                              {shopkeeper.overdueDeliveries > 0 && (
                                <span className="text-red-600 ml-1">| Overdue: {shopkeeper.overdueDeliveries}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">₹{parseFloat(shopkeeper.totalEarnings).toFixed(2)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <BarChart3 className="h-4 w-4 text-indigo-500" />
                              <span className="font-medium">{shopkeeper.deliverySuccessRate}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={shopkeeper.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {shopkeeper.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedShopkeeper(shopkeeper);
                                fetchShopkeeperDetails(shopkeeper.shopkeeperAddress);
                                setActiveTab('overview');
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedShopkeeper(shopkeeper);
                                fetchShopkeeperDetails(shopkeeper.shopkeeperAddress);
                                setActiveTab('deliveries');
                              }}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Shopkeeper View */}
        {selectedShopkeeper && (
          <Card className="border-green-100 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Shopkeeper Details: {selectedShopkeeper.name}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedShopkeeper(null);
                    setShopkeeperDetails(null);
                    setShopkeeperTokens([]);
                    setShopkeeperPayments([]);
                    setShopkeeperMetrics(null);
                    setPendingDeliveries([]);
                    setAssignedAgent(null);
                  }}
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  {shopkeeperDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <h4 className="font-medium text-gray-600">Total Consumers</h4>
                            <p className="text-2xl font-bold">{shopkeeperDetails.totalConsumersAssigned || 0}</p>
                            <p className="text-sm text-gray-500">
                              Active: {shopkeeperMetrics?.activeConsumers || 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <h4 className="font-medium text-gray-600">Current Month</h4>
                            <p className="text-2xl font-bold">{shopkeeperDetails.currentMonthTokensIssued || 0}</p>
                            <p className="text-sm text-gray-500">Tokens Issued</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <h4 className="font-medium text-gray-600">Total Earnings</h4>
                            <p className="text-2xl font-bold">
                              ₹{shopkeeperDetails.totalEarnings ? parseFloat(ethers.formatEther(shopkeeperDetails.totalEarnings)).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-sm text-gray-500">All Time</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Assigned Delivery Agent */}
                  {assignedAgent && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Assigned Delivery Agent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{assignedAgent.name}</h4>
                              <p className="text-sm text-gray-600">Mobile: {assignedAgent.mobile}</p>
                              <p className="text-sm text-gray-600">
                                Address: {assignedAgent.agentAddress.slice(0, 10)}...{assignedAgent.agentAddress.slice(-8)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Total Deliveries: {assignedAgent.totalDeliveries.toString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Active Agent
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Deliveries Tab */}
                <TabsContent value="deliveries" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Pending Deliveries Management</h3>
                    <Button
                      onClick={() => fetchShopkeeperDetails(selectedShopkeeper.shopkeeperAddress)}
                      disabled={processingAction}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${processingAction ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {pendingDeliveries.length > 0 ? (
                    <div className="space-y-3">
                      {pendingDeliveries.map((delivery, index) => {
                        const expiryStatus = getExpiryStatus(delivery.expiryTime);
                        return (
                          <Card key={index} className="border-l-4 border-l-amber-400">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{delivery.consumerName}</h4>
                                  <div className="mt-1 grid grid-cols-2 gap-4 text-sm text-gray-600">
                                    <span>Token ID: {delivery.tokenId}</span>
                                    <span>Aadhaar: {delivery.aadhaar}</span>
                                    <span>Amount: {delivery.rationAmount} kg</span>
                                    <Badge variant={expiryStatus.color} className="w-fit">
                                      {expiryStatus.text}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => markDeliveryCompleted(delivery.aadhaar, delivery.tokenId)}
                                    disabled={processingAction}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Mark Delivered
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => initiatePayment(delivery.aadhaar, delivery.tokenId)}
                                    disabled={processingAction}
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Initiate Payment
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {pendingDeliveries.length > 1 && (
                        <Card className="border-dashed">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <Button
                                onClick={() => bulkMarkDeliveries(pendingDeliveries)}
                                disabled={processingAction}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark All {pendingDeliveries.length} Deliveries as Completed
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No pending deliveries</p>
                    </div>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-4">
                  <h3 className="text-lg font-medium">Payment Management</h3>
                  
                  {shopkeeperPayments.length > 0 ? (
                    <div className="space-y-3">
                      {shopkeeperPayments.map((payment, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">Payment ID: {payment.paymentId}</h4>
                                <div className="mt-1 grid grid-cols-2 gap-4 text-sm text-gray-600">
                                  <span>Aadhaar: {payment.aadhaar}</span>
                                  <span>Token ID: {payment.tokenId}</span>
                                  <span>Amount: ₹{payment.amount}</span>
                                  <span>Method: {payment.paymentMethod}</span>
                                  <span>Status: {payment.status}</span>
                                  <span>Date: {formatDate(payment.timestamp)}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {payment.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => completePayment(payment.paymentId, `UPI_${Date.now()}`)}
                                      disabled={processingAction}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => failPayment(payment.paymentId, 'Admin action')}
                                      disabled={processingAction}
                                    >
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Fail
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No payment records</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tokens Tab */}
                <TabsContent value="tokens" className="space-y-4">
                  <h3 className="text-lg font-medium">Assigned Tokens</h3>
                  
                  {shopkeeperTokens.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shopkeeperTokens.map((tokenId, index) => (
                        <Card key={index}>
                          <CardContent className="p-4 text-center">
                            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <h4 className="font-medium">Token #{tokenId.toString()}</h4>
                            <p className="text-sm text-gray-500">Assigned to this shopkeeper</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No tokens assigned</p>
                    </div>
                  )}
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics" className="space-y-4">
                  <h3 className="text-lg font-medium">Performance Metrics</h3>
                  
                  {shopkeeperMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Delivery Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span>Success Rate:</span>
                              <span className="font-bold text-green-600">{shopkeeperMetrics.deliverySuccessRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Current Month Deliveries:</span>
                              <span className="font-medium">{shopkeeperMetrics.currentMonthDeliveries}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pending Deliveries:</span>
                              <span className="font-medium text-amber-600">{shopkeeperMetrics.pendingDeliveries}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Overdue Deliveries:</span>
                              <span className="font-medium text-red-600">{shopkeeperMetrics.overdueDeliveries}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Consumer Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span>Total Assigned:</span>
                              <span className="font-medium">{shopkeeperMetrics.totalAssignedConsumers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active Consumers:</span>
                              <span className="font-medium text-green-600">{shopkeeperMetrics.activeConsumers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tokens Issued This Month:</span>
                              <span className="font-medium">{shopkeeperMetrics.currentMonthTokensIssued}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Data fetched directly from blockchain • Last updated: {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}