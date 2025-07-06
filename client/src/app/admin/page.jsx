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
  FileText, BarChart3, PieChart, Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Token generation loading states
  const [generatingTokens, setGeneratingTokens] = useState({
    monthly: false,
    bpl: false,
    apl: false,
    bulk: false,
    expiring: false
  });

  // System management loading states
  const [systemActions, setSystemActions] = useState({
    pausing: false,
    unpausing: false,
    settingPrice: false,
    settingSubsidy: false
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Price and subsidy management states
  const [priceSettings, setPriceSettings] = useState({
    rationPrice: '',
    subsidyPercentage: ''
  });

  // Test blockchain connection
  const testConnection = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=test-connection');
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Blockchain connection test successful!<br/>
          Contract Address: ${data.contractAddress}<br/>
          Network: ${data.network}<br/>
          Admin Wallet: ${data.adminWallet}<br/>
          Block Number: ${data.blockNumber || 'N/A'}`);
      } else {
        setError(`❌ Blockchain connection test failed: ${data.error}`);
      }
    } catch (error) {
      setError(`❌ Connection test failed: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Transaction monitoring
  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent('addTransaction', { detail: txData });
    window.dispatchEvent(event);
  };

  // Load dashboard data on component mount
  useEffect(() => {
    console.log('🔄 Loading admin dashboard data...');
    
    // Clear any existing data first to avoid showing stale data
    setDashboardData(null);
    setPaymentAnalytics(null);
    setSystemSettings(null);
    setRecentActivity([]);
    setSystemHealth(null);
    
    // Fetch fresh data
    fetchDashboardData();
    fetchPendingRegistrations();
    fetchRecentActivity();
    fetchSystemHealth();
    fetchPaymentAnalytics();
    fetchSystemSettings();
  }, []);

  // Fetch main dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      const response = await fetch(`/api/admin?endpoint=dashboard&_t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      console.log('📊 Dashboard response:', data);
      
      if (data.success) {
        setDashboardData(data.data);
        
        // Show warning if there are blockchain connection issues
        if (data.warning) {
          setError(`⚠️ ${data.warning}`);
        } else if (data.error) {
          setError(`❌ Blockchain connection failed: ${data.warning || 'Unknown error'}`);
        } else {
          // Clear any previous errors if data loads successfully
          setError('');
        }
      } else {
        setError('❌ Failed to load dashboard data: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('❌ Failed to connect to backend API');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Fetch pending consumer registrations
  const fetchPendingRegistrations = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=pending-registrations');
      const data = await response.json();
      
      if (data.success) {
        setPendingRegistrations(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
    }
  };

  // Fetch recent system activity
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=recent-activity&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setRecentActivity(data.data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=system-health-report');
      const data = await response.json();
      
      if (data.success) {
        setSystemHealth(data.data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  // Fetch payment analytics data
  const fetchPaymentAnalytics = async () => {
    try {
      console.log('🔄 Fetching payment analytics...');
      
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      const response = await fetch(`/api/admin?endpoint=payment-analytics&_t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      console.log('💰 Payment analytics response:', data);
      
      if (data.success) {
        setPaymentAnalytics(data.data);
        
        // Show warning if there are blockchain connection issues
        if (data.warning) {
          console.log('⚠️ Payment analytics warning:', data.warning);
        }
      } else {
        console.error('❌ Failed to fetch payment analytics:', data.error);
        // Set to zeros to show no data available
        setPaymentAnalytics({
          totalPayments: 0,
          totalAmount: 0,
          pendingPayments: 0,
          failedPayments: 0,
          successRate: 0,
          averagePayment: 0,
          monthlyGrowth: 0,
          activeUsers: 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching payment analytics:', error);
      // Set to zeros to show no data available
      setPaymentAnalytics({
        totalPayments: 0,
        totalAmount: 0,
        pendingPayments: 0,
        failedPayments: 0,
        successRate: 0,
        averagePayment: 0,
        monthlyGrowth: 0,
        activeUsers: 0
      });
    }
  };

  // Fetch system settings
  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=system-settings');
      const data = await response.json();
      
      if (data.success) {
        setSystemSettings(data.data);
        setPriceSettings({
          rationPrice: data.data.rationPrice || '',
          subsidyPercentage: data.data.subsidyPercentage || ''
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  // Generate monthly tokens for all consumers
  const generateMonthlyTokens = async () => {
    try {
      setGeneratingTokens(prev => ({ ...prev, monthly: true }));
      
      const response = await fetch('/api/admin?endpoint=generate-monthly-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        // Add transaction to monitor
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Monthly Token Generation',
          details: 'Monthly tokens for all consumers',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Monthly token generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        // Refresh dashboard data after some time
        setTimeout(() => {
          fetchDashboardData();
        }, 30000); // 30 seconds
      } else {
        setError(`❌ Failed to generate tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating monthly tokens:', error);
      setError('Failed to generate monthly tokens');
    } finally {
      setGeneratingTokens(prev => ({ ...prev, monthly: false }));
    }
  };

  // Generate BPL tokens
  const generateBPLTokens = async () => {
    try {
      setGeneratingTokens(prev => ({ ...prev, bpl: true }));
      
      const response = await fetch('/api/admin?endpoint=generate-bpl-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'BPL Token Generation',
          details: 'Tokens for BPL consumers',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ BPL tokens generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchDashboardData();
        }, 30000);
      } else {
        setError(`❌ Failed to generate BPL tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating BPL tokens:', error);
      setError('Failed to generate BPL tokens');
    } finally {
      setGeneratingTokens(prev => ({ ...prev, bpl: false }));
    }
  };

  // Generate APL tokens
  const generateAPLTokens = async () => {
    try {
      setGeneratingTokens(prev => ({ ...prev, apl: true }));
      
      const response = await fetch('/api/admin?endpoint=generate-apl-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'APL Token Generation',
          details: 'Tokens for APL consumers',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ APL tokens generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchDashboardData();
        }, 30000);
      } else {
        setError(`❌ Failed to generate APL tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating APL tokens:', error);
      setError('Failed to generate APL tokens');
    } finally {
      setGeneratingTokens(prev => ({ ...prev, apl: false }));
    }
  };

  // Bulk generate tokens
  const generateBulkTokens = async () => {
    try {
      setGeneratingTokens(prev => ({ ...prev, bulk: true }));
      
      const response = await fetch('/api/admin?endpoint=bulk-generate-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Bulk Token Generation',
          details: 'Bulk tokens for all eligible consumers',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Bulk token generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchDashboardData();
        }, 30000);
      } else {
        setError(`❌ Failed to generate bulk tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating bulk tokens:', error);
      setError('Failed to generate bulk tokens');
    } finally {
      setGeneratingTokens(prev => ({ ...prev, bulk: false }));
    }
  };

  // Expire old tokens
  const expireOldTokens = async () => {
    try {
      setGeneratingTokens(prev => ({ ...prev, expiring: true }));
      
      const response = await fetch('/api/admin?endpoint=expire-old-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Token Expiration',
          details: 'Expired old tokens',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Token expiration completed! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchDashboardData();
        }, 30000);
      } else {
        setError(`❌ Failed to expire tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error expiring tokens:', error);
      setError('Failed to expire old tokens');
    } finally {
      setGeneratingTokens(prev => ({ ...prev, expiring: false }));
    }
  };

  // Pause system
  const pauseSystem = async () => {
    try {
      setSystemActions(prev => ({ ...prev, pausing: true }));
      
      const response = await fetch('/api/admin?endpoint=pause-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'System Pause',
          details: 'System has been paused',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ System paused successfully! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchSystemSettings();
        }, 10000);
      } else {
        setError(`❌ Failed to pause system: ${data.error}`);
      }
    } catch (error) {
      console.error('Error pausing system:', error);
      setError('Failed to pause system');
    } finally {
      setSystemActions(prev => ({ ...prev, pausing: false }));
    }
  };

  // Unpause system
  const unpauseSystem = async () => {
    try {
      setSystemActions(prev => ({ ...prev, unpausing: true }));
      
      const response = await fetch('/api/admin?endpoint=unpause-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'System Unpause',
          details: 'System has been unpaused',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ System unpaused successfully! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchSystemSettings();
        }, 10000);
      } else {
        setError(`❌ Failed to unpause system: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unpausing system:', error);
      setError('Failed to unpause system');
    } finally {
      setSystemActions(prev => ({ ...prev, unpausing: false }));
    }
  };

  // Set ration price
  const setRationPrice = async () => {
    try {
      setSystemActions(prev => ({ ...prev, settingPrice: true }));
      
      const response = await fetch('/api/admin?endpoint=set-ration-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price: priceSettings.rationPrice })
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Price Update',
          details: `Ration price set to ₹${priceSettings.rationPrice}`,
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Ration price updated to ₹${priceSettings.rationPrice}! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchSystemSettings();
        }, 10000);
      } else {
        setError(`❌ Failed to set ration price: ${data.error}`);
      }
    } catch (error) {
      console.error('Error setting ration price:', error);
      setError('Failed to set ration price');
    } finally {
      setSystemActions(prev => ({ ...prev, settingPrice: false }));
    }
  };

  // Set subsidy percentage
  const setSubsidyPercentage = async () => {
    try {
      setSystemActions(prev => ({ ...prev, settingSubsidy: true }));
      
      const response = await fetch('/api/admin?endpoint=set-subsidy-percentage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ percentage: priceSettings.subsidyPercentage })
      });

      const data = await response.json();
      
      if (data.success) {
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Subsidy Update',
          details: `Subsidy percentage set to ${priceSettings.subsidyPercentage}%`,
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Subsidy percentage updated to ${priceSettings.subsidyPercentage}%! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => {
          fetchSystemSettings();
        }, 10000);
      } else {
        setError(`❌ Failed to set subsidy percentage: ${data.error}`);
      }
    } catch (error) {
      console.error('Error setting subsidy percentage:', error);
      setError('Failed to set subsidy percentage');
    } finally {
      setSystemActions(prev => ({ ...prev, settingSubsidy: false }));
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats for overview cards
  const getOverviewStats = () => {
    if (!dashboardData) return [];

    return [
      {
        title: "Total Consumers",
        value: dashboardData.totalConsumers?.toString() || "0",
        change: "Active in system",
        icon: Users,
        color: "bg-blue-50 text-blue-700",
      },
      {
        title: "Shopkeepers",
        value: dashboardData.totalShopkeepers?.toString() || "0",
        change: "Registered shops",
        icon: Building,
        color: "bg-green-50 text-green-700",
      },
      {
        title: "Tokens Issued",
        value: dashboardData.totalTokensIssued?.toString() || "0",
        change: `${dashboardData.totalTokensClaimed || 0} claimed`,
        icon: Package,
        color: "bg-purple-50 text-purple-700",
      },
      {
        title: "Total Payments",
        value: paymentAnalytics?.totalPayments?.toString() || "0",
        change: `₹${paymentAnalytics?.totalAmount || 0} collected`,
        icon: DollarSign,
        color: "bg-amber-50 text-amber-700",
      },
    ];
  };

  if (loading && !dashboardData) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading dashboard data from blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Indian Public Distribution System - Blockchain Management
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open('/api/admin?endpoint=test-connection', '_blank')}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
                title="Test blockchain connection"
              >
                Test Connection
              </button>
              <button
                onClick={async () => {
                  setRefreshing(true);
                  setError('');
                  setSuccess('');
                  
                  // Clear all existing data first
                  setDashboardData(null);
                  setPaymentAnalytics(null);
                  setSystemSettings(null);
                  setSystemHealth(null);
                  setRecentActivity([]);
                  setPendingRegistrations([]);
                  
                  // Fetch fresh data
                  await Promise.all([
                    fetchDashboardData(),
                    fetchPaymentAnalytics(),
                    fetchSystemSettings(),
                    fetchSystemHealth(),
                    fetchRecentActivity(),
                    fetchPendingRegistrations()
                  ]);
                  
                  setRefreshing(false);
                }}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Force Refresh All
              </button>
            </div>
          </div>
        </div>

        {/* Blockchain Status Banner */}
        {(error && error.includes('Blockchain')) || (dashboardData && error) ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <strong>Blockchain Status:</strong> {error || 'Connection Issues'}
                <br />
                <small>Showing zero values because no real blockchain data is available. Test your connection above.</small>
              </div>
            </div>
          </div>
        ) : dashboardData && !error ? (
          <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <div>
                <strong>Blockchain Status:</strong> Connected and showing real data
                <br />
                <small>All dashboard statistics are from the live blockchain contract.</small>
              </div>
            </div>
          </div>
        ) : null}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div dangerouslySetInnerHTML={{ __html: error }} />
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
            <div dangerouslySetInnerHTML={{ __html: success }} />
            <button 
              onClick={() => setSuccess('')}
              className="float-right text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overview Stats */}
            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {getOverviewStats().map((stat, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="border-green-100 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
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
                      {/* Data source indicator */}
                      {error && error.includes('Blockchain') && (
                        <div className="mt-2">
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                            No Blockchain Data
                          </Badge>
                        </div>
                      )}
                      {!error && dashboardData && (
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Live Blockchain Data
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Simple card for raina */}
            <Card className="border-gray-200 bg-gray-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Configuration</span>
                  <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option>div for raina</option>
                    <option>Option A</option>
                    <option>Option B</option>
                    <option>Option C</option>
                    <option>Settings</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* System Health and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Blockchain Status</span>
                      <Badge className={error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        {error ? 'Disconnected' : 'Connected'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current Month</span>
                      <span className="text-sm font-medium">
                        {dashboardData?.currentMonth || 'Loading...'}/{dashboardData?.currentYear || ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Tokens</span>
                      <span className="text-sm font-medium">
                        {dashboardData?.pendingTokens || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Update</span>
                      <span className="text-xs text-gray-500">
                        {dashboardData?.lastUpdateTime ? formatDate(dashboardData.lastUpdateTime) : 'Never'}
                      </span>
                    </div>
                    {systemHealth && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">System Efficiency</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{systemHealth.systemEfficiencyScore}%</span>
                          <div className={`w-2 h-2 rounded-full ${systemHealth.systemEfficiencyScore > 75 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => router.push('/admin/consumers')}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Manage Consumers
                  </button>
                  <button
                    onClick={() => router.push('/admin/shopkeepers')}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Building className="h-4 w-4" />
                    Manage Shopkeepers
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    View Analytics
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent System Activity
                </CardTitle>
                <CardDescription>Latest blockchain transactions and events</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.details}</p>
                          <p className="text-xs text-gray-400">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="w-full mt-3 text-sm text-green-600 hover:text-green-700"
                    >
                      View All Activity & Transactions →
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>

            {/* Contract Information */}
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Contract Address:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      0xD21958aa...68B3059
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Network:</span>
                    <Badge className="bg-purple-100 text-purple-800">Polygon Amoy Testnet</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Contract Type:</span>
                    <span className="text-xs">Diamond Proxy (EIP-2535)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Connection Status:</span>
                    <Badge className={error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {error ? 'Disconnected' : 'Connected'}
                    </Badge>
                  </div>
                  {error && (
                    <div className="p-2 bg-red-50 text-red-800 rounded text-xs">
                      <strong>Issue:</strong> {error}
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <a 
                      href="https://amoy.polygonscan.com/address/0xD21958aa2130C1E8cFA88dd82b352DCa068B3059" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
                    >
                      View on PolygonScan
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                    <button
                      onClick={() => window.open('/api/admin?endpoint=test-connection', '_blank')}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors text-sm"
                    >
                      Test Connection
                      <Database className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <TransactionMonitor />
            
            {/* Additional Transaction Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="text-lg">Token Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Issued:</span>
                      <span className="font-medium">{dashboardData?.totalTokensIssued || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Claimed:</span>
                      <span className="font-medium">{dashboardData?.totalTokensClaimed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate:</span>
                      <span className="font-medium text-green-600">
                        {dashboardData?.totalTokensIssued ? 
                          Math.round((dashboardData.totalTokensClaimed / dashboardData.totalTokensIssued) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="text-lg">Network Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Network:</span>
                      <Badge className="bg-purple-100 text-purple-800">Polygon Amoy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gas Price:</span>
                      <span className="text-xs text-gray-500">~1 GWEI</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a 
                      href="https://amoy.polygonscan.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm">PolygonScan</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                    <a 
                      href="https://faucet.polygon.technology/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm">Polygon Faucet</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage consumers, shopkeepers, and delivery agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Users className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold">Consumers</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardData?.totalConsumers || 0}
                    </p>
                    <button
                      onClick={() => router.push('/admin/consumers')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Manage →
                    </button>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Building className="mx-auto h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-semibold">Shopkeepers</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {dashboardData?.totalShopkeepers || 0}
                    </p>
                    <button
                      onClick={() => router.push('/admin/shopkeepers')}
                      className="mt-2 text-sm text-green-600 hover:text-green-700"
                    >
                      Manage →
                    </button>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Truck className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                    <h3 className="font-semibold">Delivery Agents</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboardData?.totalDeliveryAgents || 0}
                    </p>
                    <button
                      onClick={() => router.push('/admin/delivery-agents')}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle>Token Management</CardTitle>
                <CardDescription>Manage ration tokens and distributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Total Issued</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {dashboardData?.totalTokensIssued || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Claimed</p>
                    <p className="text-2xl font-bold text-green-700">
                      {dashboardData?.totalTokensClaimed || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {dashboardData?.pendingTokens || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Expired</p>
                    <p className="text-2xl font-bold text-red-700">
                      {dashboardData?.totalTokensExpired || 0}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={generateMonthlyTokens}
                      disabled={generatingTokens.monthly}
                      className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      {generatingTokens.monthly ? 'Generating...' : 'Generate Monthly Tokens'}
                    </button>
                    <button
                      onClick={generateBPLTokens}
                      disabled={generatingTokens.bpl}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      {generatingTokens.bpl ? 'Generating...' : 'Generate BPL Tokens'}
                    </button>
                    <button
                      onClick={generateAPLTokens}
                      disabled={generatingTokens.apl}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      {generatingTokens.apl ? 'Generating...' : 'Generate APL Tokens'}
                    </button>
                  </div>
                  
                  {/* Advanced Token Operations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={generateBulkTokens}
                      disabled={generatingTokens.bulk}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      {generatingTokens.bulk ? 'Processing...' : 'Bulk Generate Tokens'}
                    </button>
                    <button
                      onClick={expireOldTokens}
                      disabled={generatingTokens.expiring}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      {generatingTokens.expiring ? 'Processing...' : 'Expire Old Tokens'}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => router.push('/admin/consumers')}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Individual Token Management
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Management
                </CardTitle>
                <CardDescription>Manage payments, pricing, and subsidies</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Payment Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Total Payments</p>
                    <p className="text-2xl font-bold text-green-700">
                      {paymentAnalytics?.totalPayments || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Amount Collected</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₹{paymentAnalytics?.totalAmount || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Pending Payments</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {paymentAnalytics?.pendingPayments || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Failed Payments</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {paymentAnalytics?.failedPayments || 0}
                    </p>
                  </div>
                </div>

                {/* Price and Subsidy Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Price Management</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Ration Price (per kg)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={priceSettings.rationPrice}
                            onChange={(e) => setPriceSettings(prev => ({ ...prev, rationPrice: e.target.value }))}
                            placeholder="Enter price in ₹"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                          <button
                            onClick={setRationPrice}
                            disabled={systemActions.settingPrice || !priceSettings.rationPrice}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                          >
                            {systemActions.settingPrice ? 'Setting...' : 'Set Price'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">Current: ₹{systemSettings?.rationPrice || 'Not set'}/kg</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Subsidy Percentage</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={priceSettings.subsidyPercentage}
                            onChange={(e) => setPriceSettings(prev => ({ ...prev, subsidyPercentage: e.target.value }))}
                            placeholder="Enter percentage"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          />
                          <button
                            onClick={setSubsidyPercentage}
                            disabled={systemActions.settingSubsidy || !priceSettings.subsidyPercentage}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                          >
                            {systemActions.settingSubsidy ? 'Setting...' : 'Set Subsidy'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">Current: {systemSettings?.subsidyPercentage || 'Not set'}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Payment Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => router.push('/admin/payments')}
                        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Payment History
                      </button>
                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Payment Analytics
                      </button>
                      <button
                        onClick={fetchPaymentAnalytics}
                        className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Payment Data
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Management Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Management
                </CardTitle>
                <CardDescription>Manage system settings and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System Control */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">System Control</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">System Status</p>
                          <p className="text-sm text-gray-600">
                            {systemSettings?.isPaused ? 'Paused' : 'Active'}
                          </p>
                        </div>
                        <Badge className={systemSettings?.isPaused ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${systemSettings?.isPaused ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          {systemSettings?.isPaused ? 'Paused' : 'Running'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={pauseSystem}
                          disabled={systemActions.pausing || systemSettings?.isPaused}
                          className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <Pause className="h-4 w-4" />
                          {systemActions.pausing ? 'Pausing...' : 'Pause System'}
                        </button>
                        <button
                          onClick={unpauseSystem}
                          disabled={systemActions.unpausing || !systemSettings?.isPaused}
                          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          {systemActions.unpausing ? 'Unpausing...' : 'Resume System'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">System Information</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">DCV Token Address</p>
                        <p className="text-xs font-mono break-all">
                          {systemSettings?.dcvTokenAddress || 'Not set'}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600">Payment System Status</p>
                        <p className="text-xs">
                          {systemSettings?.paymentSystemEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-600">Total Registered Users</p>
                        <p className="text-lg font-bold text-amber-700">
                          {(dashboardData?.totalConsumers || 0) + (dashboardData?.totalShopkeepers || 0) + (dashboardData?.totalDeliveryAgents || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional System Actions */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/admin/health-report')}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    System Health Report
                  </button>
                  <button
                    onClick={fetchSystemSettings}
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Settings
                  </button>
                  <button
                    onClick={() => router.push('/admin/emergency-cases')}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Emergency Cases
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Analytics
                </CardTitle>
                <CardDescription>Comprehensive system analytics and reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Distribution Analytics</h3>
                    <button
                      onClick={() => router.push('/admin/area-stats')}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Area-wise Statistics
                    </button>
                    <button
                      onClick={() => router.push('/admin/category-stats')}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <PieChart className="h-4 w-4" />
                      Category-wise Statistics
                    </button>
                    <button
                      onClick={() => router.push('/admin/deliveries')}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Delivery Analytics
                    </button>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Payment Analytics</h3>
                    <button
                      onClick={fetchPaymentAnalytics}
                      className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Payment Summary
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Payment Management
                    </button>
                    <button
                      onClick={() => router.push('/admin/shopkeepers')}
                      className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Building className="h-4 w-4" />
                      Shopkeeper Performance
                    </button>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">System Reports</h3>
                    <button
                      onClick={() => router.push('/admin/emergency-cases')}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Emergency Cases
                    </button>
                    <button
                      onClick={() => router.push('/admin/health-report')}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      System Health Report
                    </button>
                    <button
                      onClick={() => window.open('/api/admin/export-data', '_blank')}
                      className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </button>
                  </div>
                </div>

                {/* Quick Analytics Overview */}
                {paymentAnalytics && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Success Rate</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {paymentAnalytics.successRate || 0}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Avg. Payment</p>
                      <p className="text-2xl font-bold text-green-700">
                        ₹{paymentAnalytics.averagePayment || 0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Monthly Growth</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {paymentAnalytics.monthlyGrowth || 0}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-600">Active Users</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {paymentAnalytics.activeUsers || 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}