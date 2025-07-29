'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import TransactionMonitor from '@/components/TransactionMonitor';
import { motion } from "framer-motion";
import { 
  ArrowUpRight, CheckCircle2, Clock, Package, 
  Truck, Users, Wallet, Building, UserCheck,
  AlertTriangle, TrendingUp, MapPin, Calendar,
  Zap, Activity, Database, RefreshCw, DollarSign,
  CreditCard, Settings, Pause, Play, Shield,
  FileText, BarChart3, PieChart, Download,
  Bell, X, Check, Eye, UserX, UserPlus,
  Navigation, Star, Award, Target, Gauge
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendRationDialog } from "@/components/admin/SendRationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdminContractAPI, parseTransactionError } from '@/utils/blockchainUtils';
import { ethers } from 'ethers';

// Animation variants
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
  const router = useRouter();
  
  // Blockchain Integration
  const [adminContract, setAdminContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [adminWalletAddress, setAdminWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Core Dashboard States
  const [dashboardData, setDashboardData] = useState({
    totalConsumers: 0,
    totalShopkeepers: 0,
    totalDeliveryAgents: 0,
    activeDeliveries: 0,
    tokensDistributed: 0,
    systemStatus: 'Active'
  });
  
  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  
  // Pending Approvals States
  const [pendingConsumers, setPendingConsumers] = useState([]);
  const [pendingShopkeepers, setPendingShopkeepers] = useState([]);
  const [pendingAgents, setPendingAgents] = useState([]);
  
  // User Management States
  const [consumersByCategory, setConsumersByCategory] = useState({
    BPL: [],
    APL: [],
    AAY: []
  });
  const [allShopkeepers, setAllShopkeepers] = useState([]);
  const [allDeliveryAgents, setAllDeliveryAgents] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Loading States for Actions
  const [generatingTokens, setGeneratingTokens] = useState({
    monthly: false,
    bpl: false,
    apl: false,
    aay: false,
    bulk: false,
    individual: {}
  });
  
  const [systemActions, setSystemActions] = useState({
    pausing: false,
    unpausing: false,
    settingPrice: false,
    settingSubsidy: false
  });
  
  const [userActions, setUserActions] = useState({
    deactivating: {},
    reactivating: {},
    approving: {},
    rejecting: {}
  });
  
  // Settings States
  const [priceSettings, setPriceSettings] = useState({
    rationPrice: '',
    subsidyPercentage: ''
  });

  // ========== BLOCKCHAIN INITIALIZATION ==========
  
  useEffect(() => {
    initializeBlockchain();
  }, []);

  useEffect(() => {
    if (adminContract && isConnected) {
      fetchAllDashboardData();
    }
  }, [adminContract, isConnected]);

  const initializeBlockchain = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signerInstance = await provider.getSigner();
        const address = await signerInstance.getAddress();
        
        setSigner(signerInstance);
        setAdminWalletAddress(address);
        
        // Initialize contract API
        const contractAPI = new AdminContractAPI(signerInstance);
        setAdminContract(contractAPI);
        setIsConnected(true);
        
        setSuccess('✅ Successfully connected to blockchain!');
      } else {
        setError('❌ Please install MetaMask to use this dashboard');
      }
    } catch (error) {
      console.error('Error initializing blockchain:', error);
      setError('❌ Failed to connect to blockchain: ' + parseTransactionError(error));
    }
  };

  // ========== BLOCKCHAIN FUNCTIONS ==========
  
  // Test blockchain connection
  const testConnection = async () => {
    try {
      setRefreshing(true);
      if (!adminContract) {
        setError('❌ Contract not initialized');
        return;
      }
      
      const totalConsumers = await adminContract.getTotalConsumers();
      const totalShopkeepers = await adminContract.getTotalShopkeepers();
      const isPaused = await adminContract.isPaused();
      
      if (totalConsumers.success && totalShopkeepers.success && isPaused.success) {
        setSuccess(`✅ Blockchain connection test successful!<br/>
          Total Consumers: ${totalConsumers.data}<br/>
          Total Shopkeepers: ${totalShopkeepers.data}<br/>
          System Status: ${isPaused.data ? 'Paused' : 'Active'}<br/>
          Admin Wallet: ${adminWalletAddress}`);
      } else {
        setError('❌ Blockchain connection test failed');
      }
    } catch (error) {
      setError(`❌ Connection test failed: ${parseTransactionError(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Transaction monitoring helper
  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent('addTransaction', { detail: txData });
    window.dispatchEvent(event);
  };

  // ========== DATA FETCHING FUNCTIONS ==========
  
  // Fetch all dashboard data
  const fetchAllDashboardData = async () => {
    if (!adminContract) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchSystemOverview(),
        fetchUserManagementData(),
        fetchDeliveryData(),
        fetchAnalyticsData(),
        fetchPendingApprovals()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data: ' + parseTransactionError(error));
    } finally {
      setLoading(false);
    }
  };

  // 1. System Overview Data
  const fetchSystemOverview = async () => {
    try {
      const [
        totalConsumersRes,
        totalShopkeepersRes,
        totalAgentsRes,
        systemAnalyticsRes,
        isPausedRes,
        rationPriceRes,
        subsidyRes
      ] = await Promise.all([
        adminContract.getTotalConsumers(),
        adminContract.getTotalShopkeepers(),
        adminContract.getTotalDeliveryAgents(),
        adminContract.getSystemAnalytics(),
        adminContract.isPaused(),
        adminContract.getRationPrice(),
        adminContract.getSubsidyPercentage()
      ]);

      setDashboardData({
        totalConsumers: totalConsumersRes.success ? totalConsumersRes.data : 0,
        totalShopkeepers: totalShopkeepersRes.success ? totalShopkeepersRes.data : 0,
        totalDeliveryAgents: totalAgentsRes.success ? totalAgentsRes.data : 0,
        systemStatus: isPausedRes.success ? (isPausedRes.data ? 'Paused' : 'Active') : 'Unknown',
        rationPrice: rationPriceRes.success ? rationPriceRes.data : '0',
        subsidyPercentage: subsidyRes.success ? subsidyRes.data : 0
      });

      if (systemAnalyticsRes.success) {
        setSystemAnalytics(systemAnalyticsRes.data);
      }

      setPriceSettings({
        rationPrice: rationPriceRes.success ? rationPriceRes.data : '',
        subsidyPercentage: subsidyRes.success ? subsidyRes.data.toString() : ''
      });
      
    } catch (error) {
      console.error('Error fetching system overview:', error);
    }
  };

  // 2. User Management Data
  const fetchUserManagementData = async () => {
    try {
      const [
        bplConsumersRes,
        aplConsumersRes,
        aayConsumersRes,
        shopkeepersRes,
        agentsRes
      ] = await Promise.all([
        adminContract.getConsumersByCategory('BPL'),
        adminContract.getConsumersByCategory('APL'),
        adminContract.getConsumersByCategory('AAY'),
        adminContract.getAllShopkeepers(),
        adminContract.getAllDeliveryAgents()
      ]);

      setConsumersByCategory({
        BPL: bplConsumersRes.success ? bplConsumersRes.data : [],
        APL: aplConsumersRes.success ? aplConsumersRes.data : [],
        AAY: aayConsumersRes.success ? aayConsumersRes.data : []
      });

      if (shopkeepersRes.success) setAllShopkeepers(shopkeepersRes.data);
      if (agentsRes.success) setAllDeliveryAgents(agentsRes.data);
      
    } catch (error) {
      console.error('Error fetching user management data:', error);
    }
  };

  // 3. Delivery Data
  const fetchDeliveryData = async () => {
    try {
      const activeDeliveriesRes = await adminContract.getActiveDeliveries();
      
      if (activeDeliveriesRes.success) {
        setActiveDeliveries(activeDeliveriesRes.data);
      }
      
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    }
  };

  // 4. Analytics Data
  const fetchAnalyticsData = async () => {
    try {
      const [
        paymentAnalyticsRes,
        systemHealthRes
      ] = await Promise.all([
        adminContract.getPaymentAnalytics(),
        adminContract.getSystemHealthReport()
      ]);

      if (paymentAnalyticsRes.success) setPaymentAnalytics(paymentAnalyticsRes.data);
      if (systemHealthRes.success) setSystemHealth(systemHealthRes.data);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  // 5. Pending Approvals (from API/Database)
  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-pending-approvals');
      const data = await response.json();
      
      if (data.success) {
        setPendingConsumers(data.data.consumers || []);
        setPendingShopkeepers(data.data.shopkeepers || []);
        setPendingAgents(data.data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  // ========== USER REGISTRATION FUNCTIONS ==========
  
  // Approve Consumer Registration
  const approveConsumer = async (consumer) => {
    try {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [consumer.aadhaar]: true }
      }));

      const result = await adminContract.registerConsumer(
        consumer.aadhaar,
        consumer.name,
        consumer.mobile,
        consumer.category,
        consumer.assignedShopkeeper
      );
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Consumer Registration',
          details: `Registered consumer: ${consumer.name}`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Consumer ${consumer.name} approved and registered on blockchain!`);
        
        // Remove from pending list
        setPendingConsumers(prev => prev.filter(c => c.aadhaar !== consumer.aadhaar));
        
        // Refresh data
        fetchUserManagementData();
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to approve consumer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving consumer:', error);
      setError('Failed to approve consumer: ' + parseTransactionError(error));
    } finally {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [consumer.aadhaar]: false }
      }));
    }
  };

  // Approve Shopkeeper Registration
  const approveShopkeeper = async (shopkeeper) => {
    try {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [shopkeeper.address]: true }
      }));

      const result = await adminContract.registerShopkeeper(
        shopkeeper.address,
        shopkeeper.name,
        shopkeeper.area
      );
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Shopkeeper Registration',
          details: `Registered shopkeeper: ${shopkeeper.name}`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Shopkeeper ${shopkeeper.name} approved and registered on blockchain!`);
        
        // Remove from pending list
        setPendingShopkeepers(prev => prev.filter(s => s.address !== shopkeeper.address));
        
        // Refresh data
        fetchUserManagementData();
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to approve shopkeeper: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving shopkeeper:', error);
      setError('Failed to approve shopkeeper: ' + parseTransactionError(error));
    } finally {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [shopkeeper.address]: false }
      }));
    }
  };

  // Approve Delivery Agent Registration
  const approveDeliveryAgent = async (agent) => {
    try {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [agent.address]: true }
      }));

      const result = await adminContract.registerDeliveryAgent(
        agent.address,
        agent.name,
        agent.mobile
      );
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Delivery Agent Registration',
          details: `Registered delivery agent: ${agent.name}`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Delivery Agent ${agent.name} approved and registered on blockchain!`);
        
        // Remove from pending list
        setPendingAgents(prev => prev.filter(a => a.address !== agent.address));
        
        // Refresh data
        fetchUserManagementData();
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to approve delivery agent: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving delivery agent:', error);
      setError('Failed to approve delivery agent: ' + parseTransactionError(error));
    } finally {
      setUserActions(prev => ({
        ...prev,
        approving: { ...prev.approving, [agent.address]: false }
      }));
    }
  };

  // ========== TOKEN MANAGEMENT FUNCTIONS ==========
  
  // Generate Token for Individual Consumer
  const generateTokenForConsumer = async (aadhaar) => {
    try {
      setGeneratingTokens(prev => ({
        ...prev,
        individual: { ...prev.individual, [aadhaar]: true }
      }));

      const result = await adminContract.generateTokenForConsumer(aadhaar);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Individual Token Generation',
          details: `Token generated for consumer: ${aadhaar}`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Token generated for consumer ${aadhaar}!`);
        fetchUserManagementData();
      } else {
        setError(`❌ Failed to generate token: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setError('Failed to generate token: ' + parseTransactionError(error));
    } finally {
      setGeneratingTokens(prev => ({
        ...prev,
        individual: { ...prev.individual, [aadhaar]: false }
      }));
    }
  };

  // Generate Tokens for Category
  const generateTokensForCategory = async (category) => {
    try {
      setGeneratingTokens(prev => ({
        ...prev,
        [category.toLowerCase()]: true
      }));

      const result = await adminContract.generateTokensForCategory(category);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Category Token Generation',
          details: `Tokens generated for category: ${category}`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Tokens generated for all ${category} consumers!`);
        fetchUserManagementData();
      } else {
        setError(`❌ Failed to generate tokens for ${category}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating tokens for category:', error);
      setError('Failed to generate tokens: ' + parseTransactionError(error));
    } finally {
      setGeneratingTokens(prev => ({
        ...prev,
        [category.toLowerCase()]: false
      }));
    }
  };

  // ========== SYSTEM MANAGEMENT FUNCTIONS ==========
  
  // Pause System
  const pauseSystem = async () => {
    try {
      setSystemActions(prev => ({ ...prev, pausing: true }));

      const result = await adminContract.pauseSystem();
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'System Pause',
          details: 'System has been paused',
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess('✅ System paused successfully!');
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to pause system: ${result.error}`);
      }
    } catch (error) {
      console.error('Error pausing system:', error);
      setError('Failed to pause system: ' + parseTransactionError(error));
    } finally {
      setSystemActions(prev => ({ ...prev, pausing: false }));
    }
  };

  // Unpause System
  const unpauseSystem = async () => {
    try {
      setSystemActions(prev => ({ ...prev, unpausing: true }));

      const result = await adminContract.unpauseSystem();
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'System Unpause',
          details: 'System has been unpaused',
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess('✅ System unpaused successfully!');
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to unpause system: ${result.error}`);
      }
    } catch (error) {
      console.error('Error unpausing system:', error);
      setError('Failed to unpause system: ' + parseTransactionError(error));
    } finally {
      setSystemActions(prev => ({ ...prev, unpausing: false }));
    }
  };

  // Set Ration Price
  const setRationPrice = async (priceInEther) => {
    try {
      setSystemActions(prev => ({ ...prev, settingPrice: true }));

      const priceInWei = ethers.parseEther(priceInEther);
      const result = await adminContract.setRationPrice(priceInWei);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Price Update',
          details: `Ration price set to ${priceInEther} MATIC`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Ration price set to ${priceInEther} MATIC!`);
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to set ration price: ${result.error}`);
      }
    } catch (error) {
      console.error('Error setting ration price:', error);
      setError('Failed to set ration price: ' + parseTransactionError(error));
    } finally {
      setSystemActions(prev => ({ ...prev, settingPrice: false }));
    }
  };

  // Set Subsidy Percentage
  const setSubsidyPercentage = async (percentage) => {
    try {
      setSystemActions(prev => ({ ...prev, settingSubsidy: true }));

      const result = await adminContract.setSubsidyPercentage(percentage);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Subsidy Update',
          details: `Subsidy percentage set to ${percentage}%`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Subsidy percentage set to ${percentage}%!`);
        fetchSystemOverview();
      } else {
        setError(`❌ Failed to set subsidy percentage: ${result.error}`);
      }
    } catch (error) {
      console.error('Error setting subsidy percentage:', error);
      setError('Failed to set subsidy percentage: ' + parseTransactionError(error));
    } finally {
      setSystemActions(prev => ({ ...prev, settingSubsidy: false }));
    }
  };

  // ========== USER MANAGEMENT FUNCTIONS ==========
  
  // Deactivate Consumer
  const deactivateConsumer = async (aadhaar) => {
    try {
      setUserActions(prev => ({
        ...prev,
        deactivating: { ...prev.deactivating, [aadhaar]: true }
      }));

      const result = await adminContract.deactivateConsumer(aadhaar);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Consumer Deactivation',
          details: `Consumer ${aadhaar} deactivated`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Consumer ${aadhaar} deactivated successfully!`);
        fetchUserManagementData();
      } else {
        setError(`❌ Failed to deactivate consumer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deactivating consumer:', error);
      setError('Failed to deactivate consumer: ' + parseTransactionError(error));
    } finally {
      setUserActions(prev => ({
        ...prev,
        deactivating: { ...prev.deactivating, [aadhaar]: false }
      }));
    }
  };

  // Reactivate Consumer
  const reactivateConsumer = async (aadhaar) => {
    try {
      setUserActions(prev => ({
        ...prev,
        reactivating: { ...prev.reactivating, [aadhaar]: true }
      }));

      const result = await adminContract.reactivateConsumer(aadhaar);
      
      if (result.success) {
        addTransactionToMonitor({
          hash: result.txHash,
          type: 'Consumer Reactivation',
          details: `Consumer ${aadhaar} reactivated`,
          polygonScanUrl: result.polygonScanUrl
        });

        setSuccess(`✅ Consumer ${aadhaar} reactivated successfully!`);
        fetchUserManagementData();
      } else {
        setError(`❌ Failed to reactivate consumer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error reactivating consumer:', error);
      setError('Failed to reactivate consumer: ' + parseTransactionError(error));
    } finally {
      setUserActions(prev => ({
        ...prev,
        reactivating: { ...prev.reactivating, [aadhaar]: false }
      }));
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Paused': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ========== RENDER ==========
  
  if (loading && !isConnected) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Connecting to blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <TransactionMonitor />
        
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Blockchain-powered ration distribution system</p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge className={`${getStatusBadgeColor(dashboardData.systemStatus)}`}>
                  {dashboardData.systemStatus}
                </Badge>
                <Button 
                  onClick={testConnection}
                  disabled={refreshing}
                  size="sm"
                  variant="outline"
                >
                  {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Test Connection
                </Button>
                <Button 
                  onClick={fetchAllDashboardData}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div dangerouslySetInnerHTML={{ __html: error }} />
              <Button
                onClick={() => setError('')}
                size="sm"
                variant="ghost"
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              <div dangerouslySetInnerHTML={{ __html: success }} />
              <Button
                onClick={() => setSuccess('')}
                size="sm"
                variant="ghost"
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="tokens">Token Management</TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Consumers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.totalConsumers}</div>
                      <p className="text-xs text-muted-foreground">
                        Registered on blockchain
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Shopkeepers</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.totalShopkeepers}</div>
                      <p className="text-xs text-muted-foreground">
                        Active shopkeepers
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Delivery Agents</CardTitle>
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.totalDeliveryAgents}</div>
                      <p className="text-xs text-muted-foreground">
                        Active agents
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeDeliveries.length}</div>
                      <p className="text-xs text-muted-foreground">
                        In progress
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button
                      onClick={() => generateTokensForCategory('BPL')}
                      disabled={generatingTokens.bpl}
                      className="h-20 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.bpl ? (
                        <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                      ) : (
                        <Package className="h-5 w-5 mb-2" />
                      )}
                      Generate BPL Tokens
                    </Button>

                    <Button
                      onClick={() => generateTokensForCategory('APL')}
                      disabled={generatingTokens.apl}
                      className="h-20 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.apl ? (
                        <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                      ) : (
                        <Package className="h-5 w-5 mb-2" />
                      )}
                      Generate APL Tokens
                    </Button>

                    <Button
                      onClick={() => generateTokensForCategory('AAY')}
                      disabled={generatingTokens.aay}
                      className="h-20 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.aay ? (
                        <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                      ) : (
                        <Package className="h-5 w-5 mb-2" />
                      )}
                      Generate AAY Tokens
                    </Button>

                    <Button
                      onClick={() => setActiveTab('settings')}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center"
                    >
                      <Settings className="h-5 w-5 mb-2" />
                      System Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pending Approvals Tab */}
            <TabsContent value="approvals" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Consumers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Pending Consumers ({pendingConsumers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {pendingConsumers.map((consumer) => (
                        <div key={consumer.aadhaar} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{consumer.name}</h4>
                              <p className="text-sm text-gray-600">Aadhaar: {consumer.aadhaar}</p>
                              <p className="text-sm text-gray-600">Category: {consumer.category}</p>
                            </div>
                            <Badge variant="outline">{consumer.category}</Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveConsumer(consumer)}
                              disabled={userActions.approving[consumer.aadhaar]}
                            >
                              {userActions.approving[consumer.aadhaar] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={userActions.rejecting[consumer.aadhaar]}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                      {pendingConsumers.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No pending consumer approvals</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Shopkeepers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Pending Shopkeepers ({pendingShopkeepers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {pendingShopkeepers.map((shopkeeper) => (
                        <div key={shopkeeper.address} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{shopkeeper.name}</h4>
                              <p className="text-sm text-gray-600">Address: {shopkeeper.address}</p>
                              <p className="text-sm text-gray-600">Area: {shopkeeper.area}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveShopkeeper(shopkeeper)}
                              disabled={userActions.approving[shopkeeper.address]}
                            >
                              {userActions.approving[shopkeeper.address] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={userActions.rejecting[shopkeeper.address]}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                      {pendingShopkeepers.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No pending shopkeeper approvals</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Delivery Agents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Pending Agents ({pendingAgents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {pendingAgents.map((agent) => (
                        <div key={agent.address} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-gray-600">Address: {agent.address}</p>
                              <p className="text-sm text-gray-600">Mobile: {agent.mobile}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveDeliveryAgent(agent)}
                              disabled={userActions.approving[agent.address]}
                            >
                              {userActions.approving[agent.address] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={userActions.rejecting[agent.address]}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                      {pendingAgents.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No pending agent approvals</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* BPL Consumers */}
                <Card>
                  <CardHeader>
                    <CardTitle>BPL Consumers ({consumersByCategory.BPL.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {consumersByCategory.BPL.map((consumer, index) => (
                        <div key={index} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <p className="font-medium">{consumer.name || consumer[1]}</p>
                            <p className="text-sm text-gray-600">ID: {consumer.aadhaar || consumer[0]}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => generateTokenForConsumer(consumer.aadhaar || consumer[0])}
                            disabled={generatingTokens.individual[consumer.aadhaar || consumer[0]]}
                          >
                            {generatingTokens.individual[consumer.aadhaar || consumer[0]] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Generate Token'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* APL Consumers */}
                <Card>
                  <CardHeader>
                    <CardTitle>APL Consumers ({consumersByCategory.APL.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {consumersByCategory.APL.map((consumer, index) => (
                        <div key={index} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <p className="font-medium">{consumer.name || consumer[1]}</p>
                            <p className="text-sm text-gray-600">ID: {consumer.aadhaar || consumer[0]}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => generateTokenForConsumer(consumer.aadhaar || consumer[0])}
                            disabled={generatingTokens.individual[consumer.aadhaar || consumer[0]]}
                          >
                            {generatingTokens.individual[consumer.aadhaar || consumer[0]] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Generate Token'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AAY Consumers */}
                <Card>
                  <CardHeader>
                    <CardTitle>AAY Consumers ({consumersByCategory.AAY.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {consumersByCategory.AAY.map((consumer, index) => (
                        <div key={index} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <p className="font-medium">{consumer.name || consumer[1]}</p>
                            <p className="text-sm text-gray-600">ID: {consumer.aadhaar || consumer[0]}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => generateTokenForConsumer(consumer.aadhaar || consumer[0])}
                            disabled={generatingTokens.individual[consumer.aadhaar || consumer[0]]}
                          >
                            {generatingTokens.individual[consumer.aadhaar || consumer[0]] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Generate Token'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Token Management Tab */}
            <TabsContent value="tokens" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Token Management</CardTitle>
                  <CardDescription>Generate and manage ration tokens</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => generateTokensForCategory('BPL')}
                      disabled={generatingTokens.bpl}
                      className="h-24 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.bpl ? (
                        <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                      ) : (
                        <Package className="h-6 w-6 mb-2" />
                      )}
                      <span>Generate BPL Tokens</span>
                      <span className="text-xs">({consumersByCategory.BPL.length} consumers)</span>
                    </Button>

                    <Button
                      onClick={() => generateTokensForCategory('APL')}
                      disabled={generatingTokens.apl}
                      className="h-24 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.apl ? (
                        <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                      ) : (
                        <Package className="h-6 w-6 mb-2" />
                      )}
                      <span>Generate APL Tokens</span>
                      <span className="text-xs">({consumersByCategory.APL.length} consumers)</span>
                    </Button>

                    <Button
                      onClick={() => generateTokensForCategory('AAY')}
                      disabled={generatingTokens.aay}
                      className="h-24 flex flex-col items-center justify-center"
                    >
                      {generatingTokens.aay ? (
                        <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                      ) : (
                        <Package className="h-6 w-6 mb-2" />
                      )}
                      <span>Generate AAY Tokens</span>
                      <span className="text-xs">({consumersByCategory.AAY.length} consumers)</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deliveries Tab */}
            <TabsContent value="deliveries" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Deliveries</CardTitle>
                  <CardDescription>Monitor ongoing deliveries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeDeliveries.length > 0 ? (
                      activeDeliveries.map((delivery, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">Delivery #{delivery.id || index + 1}</h4>
                              <p className="text-sm text-gray-600">
                                Consumer: {delivery.consumerAadhaar || delivery[0]}
                              </p>
                              <p className="text-sm text-gray-600">
                                Agent: {delivery.agentAddress || delivery[1]}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {delivery.status || 'In Progress'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No active deliveries</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Control */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Control</CardTitle>
                    <CardDescription>Manage system operations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">System Status</h4>
                        <p className="text-sm text-gray-600">Current: {dashboardData.systemStatus}</p>
                      </div>
                      <div className="flex space-x-2">
                        {dashboardData.systemStatus === 'Active' ? (
                          <Button
                            onClick={pauseSystem}
                            disabled={systemActions.pausing}
                            variant="destructive"
                          >
                            {systemActions.pausing ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Pause className="h-4 w-4 mr-2" />
                            )}
                            Pause System
                          </Button>
                        ) : (
                          <Button
                            onClick={unpauseSystem}
                            disabled={systemActions.unpausing}
                          >
                            {systemActions.unpausing ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Unpause System
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Price Settings</CardTitle>
                    <CardDescription>Manage ration pricing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ration Price (MATIC)
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={priceSettings.rationPrice}
                          onChange={(e) => setPriceSettings(prev => ({
                            ...prev,
                            rationPrice: e.target.value
                          }))}
                          placeholder="Enter price in MATIC"
                        />
                        <Button
                          onClick={() => setRationPrice(priceSettings.rationPrice)}
                          disabled={systemActions.settingPrice || !priceSettings.rationPrice}
                        >
                          {systemActions.settingPrice ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Set Price'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {dashboardData.rationPrice} MATIC
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Subsidy Percentage (%)
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={priceSettings.subsidyPercentage}
                          onChange={(e) => setPriceSettings(prev => ({
                            ...prev,
                            subsidyPercentage: e.target.value
                          }))}
                          placeholder="Enter percentage"
                        />
                        <Button
                          onClick={() => setSubsidyPercentage(parseInt(priceSettings.subsidyPercentage))}
                          disabled={systemActions.settingSubsidy || !priceSettings.subsidyPercentage}
                        >
                          {systemActions.settingSubsidy ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Set Subsidy'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {dashboardData.subsidyPercentage}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
