// 'use client';
// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import AdminLayout from '@/components/AdminLayout';
// import TransactionMonitor from '@/components/TransactionMonitor';
// import { motion } from "framer-motion";
// import { 
//   ArrowUpRight, CheckCircle2, Clock, Package, 
//   Truck, Users, Wallet, Building, UserCheck,
//   AlertTriangle, TrendingUp, MapPin, Calendar,
//   Zap, Activity, Database, RefreshCw
// } from "lucide-react";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// // Animation variants
// const containerVariants = {
//   hidden: { opacity: 0 },
//   show: {
//     opacity: 1,
//     transition: {
//       staggerChildren: 0.1,
//     },
//   },
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   show: {
//     opacity: 1,
//     y: 0,
//     transition: {
//       type: "spring",
//       stiffness: 100,
//       damping: 15,
//     },
//   },
// };

// export default function AdminDashboard() {
//   const router = useRouter();
  
//   // Dashboard data states
//   const [dashboardData, setDashboardData] = useState(null);
//   const [pendingRegistrations, setPendingRegistrations] = useState([]);
//   const [recentActivity, setRecentActivity] = useState([]);
//   const [systemHealth, setSystemHealth] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [refreshing, setRefreshing] = useState(false);

//   // Token generation loading states
//   const [generatingTokens, setGeneratingTokens] = useState({
//     monthly: false,
//     bpl: false,
//     apl: false
//   });

//   // Active tab state
//   const [activeTab, setActiveTab] = useState('overview');

//   // Transaction monitoring
//   const addTransactionToMonitor = (txData) => {
//     const event = new CustomEvent('addTransaction', { detail: txData });
//     window.dispatchEvent(event);
//   };

//   // Load dashboard data on component mount
//   useEffect(() => {
//     fetchDashboardData();
//     fetchPendingRegistrations();
//     fetchRecentActivity();
//     fetchSystemHealth();
//   }, []);

//   // Fetch main dashboard data
//   const fetchDashboardData = async () => {
//     try {
//       setRefreshing(true);
//       const response = await fetch('/api/admin?endpoint=dashboard');
//       const data = await response.json();
      
//       if (data.success) {
//         setDashboardData(data.data);
//       } else {
//         setError('Failed to load dashboard data: ' + data.error);
//       }
//     } catch (error) {
//       console.error('Error fetching dashboard data:', error);
//       setError('Failed to connect to blockchain');
//     } finally {
//       setRefreshing(false);
//       setLoading(false);
//     }
//   };

//   // Fetch pending consumer registrations
//   const fetchPendingRegistrations = async () => {
//     try {
//       const response = await fetch('/api/admin?endpoint=pending-registrations');
//       const data = await response.json();
      
//       if (data.success) {
//         setPendingRegistrations(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching pending registrations:', error);
//     }
//   };

//   // Fetch recent system activity
//   const fetchRecentActivity = async () => {
//     try {
//       const response = await fetch('/api/admin?endpoint=recent-activity&limit=10');
//       const data = await response.json();
      
//       if (data.success) {
//         setRecentActivity(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching recent activity:', error);
//     }
//   };

//   // Fetch system health data
//   const fetchSystemHealth = async () => {
//     try {
//       const response = await fetch('/api/admin?endpoint=system-health-report');
//       const data = await response.json();
      
//       if (data.success) {
//         setSystemHealth(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching system health:', error);
//     }
//   };

//   // Generate monthly tokens for all consumers
//   const generateMonthlyTokens = async () => {
//     try {
//       setGeneratingTokens(prev => ({ ...prev, monthly: true }));
      
//       const response = await fetch('/api/admin?endpoint=generate-monthly-tokens', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({})
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         // Add transaction to monitor
//         addTransactionToMonitor({
//           hash: data.txHash,
//           type: 'Monthly Token Generation',
//           details: 'Monthly tokens for all consumers',
//           polygonScanUrl: data.polygonScanUrl
//         });

//         setSuccess(`✅ Monthly token generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
//         // Refresh dashboard data after some time
//         setTimeout(() => {
//           fetchDashboardData();
//         }, 30000); // 30 seconds
//       } else {
//         setError(`❌ Failed to generate tokens: ${data.error}`);
//       }
//     } catch (error) {
//       console.error('Error generating monthly tokens:', error);
//       setError('Failed to generate monthly tokens');
//     } finally {
//       setGeneratingTokens(prev => ({ ...prev, monthly: false }));
//     }
//   };

//   // Generate BPL tokens
//   const generateBPLTokens = async () => {
//     try {
//       setGeneratingTokens(prev => ({ ...prev, bpl: true }));
      
//       const response = await fetch('/api/admin?endpoint=generate-bpl-tokens', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({})
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         addTransactionToMonitor({
//           hash: data.txHash,
//           type: 'BPL Token Generation',
//           details: 'Tokens for BPL consumers',
//           polygonScanUrl: data.polygonScanUrl
//         });

//         setSuccess(`✅ BPL tokens generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
//         setTimeout(() => {
//           fetchDashboardData();
//         }, 30000);
//       } else {
//         setError(`❌ Failed to generate BPL tokens: ${data.error}`);
//       }
//     } catch (error) {
//       console.error('Error generating BPL tokens:', error);
//       setError('Failed to generate BPL tokens');
//     } finally {
//       setGeneratingTokens(prev => ({ ...prev, bpl: false }));
//     }
//   };

//   // Generate APL tokens
//   const generateAPLTokens = async () => {
//     try {
//       setGeneratingTokens(prev => ({ ...prev, apl: true }));
      
//       const response = await fetch('/api/admin?endpoint=generate-apl-tokens', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({})
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         addTransactionToMonitor({
//           hash: data.txHash,
//           type: 'APL Token Generation',
//           details: 'Tokens for APL consumers',
//           polygonScanUrl: data.polygonScanUrl
//         });

//         setSuccess(`✅ APL tokens generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
//         setTimeout(() => {
//           fetchDashboardData();
//         }, 30000);
//       } else {
//         setError(`❌ Failed to generate APL tokens: ${data.error}`);
//       }
//     } catch (error) {
//       console.error('Error generating APL tokens:', error);
//       setError('Failed to generate APL tokens');
//     } finally {
//       setGeneratingTokens(prev => ({ ...prev, apl: false }));
//     }
//   };

//   // Format date for display
//   const formatDate = (timestamp) => {
//     return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Calculate stats for overview cards
//   const getOverviewStats = () => {
//     if (!dashboardData) return [];

//     return [
//       {
//         title: "Total Consumers",
//         value: dashboardData.totalConsumers?.toString() || "0",
//         change: "Active in system",
//         icon: Users,
//         color: "bg-blue-50 text-blue-700",
//       },
//       {
//         title: "Shopkeepers",
//         value: dashboardData.totalShopkeepers?.toString() || "0",
//         change: "Registered shops",
//         icon: Building,
//         color: "bg-green-50 text-green-700",
//       },
//       {
//         title: "Tokens Issued",
//         value: dashboardData.totalTokensIssued?.toString() || "0",
//         change: `${dashboardData.totalTokensClaimed || 0} claimed`,
//         icon: Package,
//         color: "bg-purple-50 text-purple-700",
//       },
//       {
//         title: "Delivery Agents",
//         value: dashboardData.totalDeliveryAgents?.toString() || "0",
//         change: "Active agents",
//         icon: Truck,
//         color: "bg-orange-50 text-orange-700",
//       },
//     ];
//   };

//   if (loading && !dashboardData) {
//     return (
//       <AdminLayout>
//         <div className="container mx-auto p-6">
//           <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
//             <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
//             <p>Loading dashboard data from blockchain...</p>
//           </div>
//         </div>
//       </AdminLayout>
//     );
//   }

//   return (
//     <AdminLayout>
//       <div className="container mx-auto p-6">
//         <div className="flex flex-col gap-2 mb-6">
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-3xl font-bold text-green-900">Admin Dashboard</h1>
//               <p className="text-muted-foreground">
//                 Indian Public Distribution System - Blockchain Management
//               </p>
//             </div>
//             <button
//               onClick={fetchDashboardData}
//               disabled={refreshing}
//               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
//             >
//               <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
//               Refresh
//             </button>
//           </div>
//         </div>

//         {/* Error/Success Messages */}
//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             <div dangerouslySetInnerHTML={{ __html: error }} />
//             <button 
//               onClick={() => setError('')}
//               className="float-right text-red-700 hover:text-red-900"
//             >
//               ×
//             </button>
//           </div>
//         )}

//         {success && (
//           <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
//             <div dangerouslySetInnerHTML={{ __html: success }} />
//             <button 
//               onClick={() => setSuccess('')}
//               className="float-right text-green-700 hover:text-green-900"
//             >
//               ×
//             </button>
//           </div>
//         )}

//         {/* Quick Token Generation Actions */}
//         <Card className="border-green-100 mb-6">
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Zap className="h-5 w-5" />
//               Quick Token Generation
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <button
//                 onClick={generateMonthlyTokens}
//                 disabled={generatingTokens.monthly}
//                 className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
//               >
//                 {generatingTokens.monthly ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
//                     Generating...
//                   </>
//                 ) : (
//                   <>
//                     <Package className="h-4 w-4" />
//                     Generate Monthly Tokens
//                   </>
//                 )}
//               </button>
              
//               <button
//                 onClick={generateBPLTokens}
//                 disabled={generatingTokens.bpl}
//                 className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
//               >
//                 {generatingTokens.bpl ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
//                     Generating...
//                   </>
//                 ) : (
//                   <>
//                     <Users className="h-4 w-4" />
//                     Generate BPL Tokens
//                   </>
//                 )}
//               </button>
              
//               <button
//                 onClick={generateAPLTokens}
//                 disabled={generatingTokens.apl}
//                 className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
//               >
//                 {generatingTokens.apl ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
//                     Generating...
//                   </>
//                 ) : (
//                   <>
//                     <UserCheck className="h-4 w-4" />
//                     Generate APL Tokens
//                   </>
//                 )}
//               </button>
//             </div>
//           </CardContent>
//         </Card>

//         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//           <TabsList className="grid w-full grid-cols-5">
//             <TabsTrigger value="overview">Overview</TabsTrigger>
//             <TabsTrigger value="transactions">
//               Transactions
//             </TabsTrigger>
//             <TabsTrigger value="users">Users</TabsTrigger>
//             <TabsTrigger value="tokens">Tokens</TabsTrigger>
//             <TabsTrigger value="analytics">Analytics</TabsTrigger>
//           </TabsList>

//           {/* Overview Tab */}
//           <TabsContent value="overview" className="space-y-6">
//             {/* Overview Stats */}
//             <motion.div
//               className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
//               variants={containerVariants}
//               initial="hidden"
//               animate="show"
//             >
//               {getOverviewStats().map((stat, index) => (
//                 <motion.div key={index} variants={itemVariants}>
//                   <Card className="border-green-100 hover:shadow-md transition-shadow">
//                     <CardContent className="p-6">
//                       <div className="flex items-center justify-between pb-2">
//                         <p className="text-sm font-medium text-gray-600">{stat.title}</p>
//                         <div className={`rounded-full p-2 ${stat.color}`}>
//                           <stat.icon className="h-4 w-4" />
//                         </div>
//                       </div>
//                       <div className="text-2xl font-bold">{stat.value}</div>
//                       <p className="text-xs text-green-600 flex items-center mt-1">
//                         {stat.change}
//                         <ArrowUpRight className="ml-1 h-3 w-3" />
//                       </p>
//                     </CardContent>
//                   </Card>
//                 </motion.div>
//               ))}
//             </motion.div>

//             {/* System Health and Quick Actions */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* System Health */}
//               <Card className="border-green-100">
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <TrendingUp className="h-5 w-5" />
//                     System Health
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm">Blockchain Status</span>
//                       <Badge className="bg-green-100 text-green-800">
//                         <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
//                         Online
//                       </Badge>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm">Current Month</span>
//                       <span className="text-sm font-medium">
//                         {dashboardData?.currentMonth || 'Loading...'}/{dashboardData?.currentYear || ''}
//                       </span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm">Pending Tokens</span>
//                       <span className="text-sm font-medium">
//                         {dashboardData?.pendingTokens || 0}
//                       </span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm">Last Update</span>
//                       <span className="text-xs text-gray-500">
//                         {dashboardData?.lastUpdateTime ? formatDate(dashboardData.lastUpdateTime) : 'Never'}
//                       </span>
//                     </div>
//                     {systemHealth && (
//                       <div className="flex justify-between items-center">
//                         <span className="text-sm">System Efficiency</span>
//                         <div className="flex items-center gap-2">
//                           <span className="text-sm font-medium">{systemHealth.systemEfficiencyScore}%</span>
//                           <div className={`w-2 h-2 rounded-full ${systemHealth.systemEfficiencyScore > 75 ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Quick Actions */}
//               <Card className="border-green-100">
//                 <CardHeader>
//                   <CardTitle className="flex items-center gap-2">
//                     <Zap className="h-5 w-5" />
//                     Quick Actions
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-3">
//                   <button
//                     onClick={generateMonthlyTokens}
//                     disabled={generatingTokens.monthly}
//                     className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                   >
//                     <Package className="h-4 w-4" />
//                     {generatingTokens.monthly ? 'Generating...' : 'Generate Monthly Tokens'}
//                   </button>
//                   <button
//                     onClick={() => router.push('/admin/consumers')}
//                     className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                   >
//                     <Users className="h-4 w-4" />
//                     Manage Consumers
//                   </button>
//                   <button
//                     onClick={() => setActiveTab('analytics')}
//                     className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                   >
//                     <TrendingUp className="h-4 w-4" />
//                     View Analytics
//                   </button>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* Recent Activity */}
//             <Card className="border-green-100">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Activity className="h-5 w-5" />
//                   Recent System Activity
//                 </CardTitle>
//                 <CardDescription>Latest blockchain transactions and events</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {recentActivity.length > 0 ? (
//                   <div className="space-y-3">
//                     {recentActivity.slice(0, 5).map((activity, index) => (
//                       <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
//                         <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
//                         <div className="flex-1">
//                           <p className="text-sm font-medium">{activity.action}</p>
//                           <p className="text-xs text-gray-500">{activity.details}</p>
//                           <p className="text-xs text-gray-400">{formatDate(activity.timestamp)}</p>
//                         </div>
//                       </div>
//                     ))}
//                     <button
//                       onClick={() => setActiveTab('transactions')}
//                       className="w-full mt-3 text-sm text-green-600 hover:text-green-700"
//                     >
//                       View All Activity & Transactions →
//                     </button>
//                   </div>
//                 ) : (
//                   <p className="text-gray-500 text-center py-4">No recent activity</p>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Contract Information */}
//             <Card className="border-green-100">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Database className="h-5 w-5" />
//                   Contract Information
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3 text-sm">
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Contract Address:</span>
//                     <code className="bg-gray-100 px-2 py-1 rounded text-xs">
//                       0xB58Ec...9c80
//                     </code>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Network:</span>
//                     <Badge className="bg-purple-100 text-purple-800">Polygon Amoy Testnet</Badge>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Contract Type:</span>
//                     <span className="text-xs">Diamond Proxy (EIP-2535)</span>
//                   </div>
//                   <div className="mt-4">
//                     <a 
//                       href="https://amoy.polygonscan.com/address/0xB58Ec9EC4a0a8cfFEA29db6099f094a079919c80" 
//                       target="_blank" 
//                       rel="noopener noreferrer"
//                       className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
//                     >
//                       View on PolygonScan
//                       <ArrowUpRight className="ml-2 h-4 w-4" />
//                     </a>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Transactions Tab */}
//           <TabsContent value="transactions" className="space-y-6">
//             <TransactionMonitor />
            
//             {/* Additional Transaction Stats */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <Card className="border-green-100">
//                 <CardHeader>
//                   <CardTitle className="text-lg">Token Transactions</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Total Issued:</span>
//                       <span className="font-medium">{dashboardData?.totalTokensIssued || 0}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Total Claimed:</span>
//                       <span className="font-medium">{dashboardData?.totalTokensClaimed || 0}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Success Rate:</span>
//                       <span className="font-medium text-green-600">
//                         {dashboardData?.totalTokensIssued ? 
//                           Math.round((dashboardData.totalTokensClaimed / dashboardData.totalTokensIssued) * 100) 
//                           : 0}%
//                       </span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>

//               <Card className="border-green-100">
//                 <CardHeader>
//                   <CardTitle className="text-lg">Network Status</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Network:</span>
//                       <Badge className="bg-purple-100 text-purple-800">Polygon Amoy</Badge>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Status:</span>
//                       <Badge className="bg-green-100 text-green-800">Connected</Badge>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-sm text-gray-600">Gas Price:</span>
//                       <span className="text-xs text-gray-500">~1 GWEI</span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>

//               <Card className="border-green-100">
//                 <CardHeader>
//                   <CardTitle className="text-lg">Quick Links</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <a 
//                       href="https://amoy.polygonscan.com/" 
//                       target="_blank" 
//                       rel="noopener noreferrer"
//                       className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
//                     >
//                       <span className="text-sm">PolygonScan</span>
//                       <ArrowUpRight className="h-3 w-3" />
//                     </a>
//                     <a 
//                       href="https://faucet.polygon.technology/" 
//                       target="_blank" 
//                       rel="noopener noreferrer"
//                       className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
//                     >
//                       <span className="text-sm">Polygon Faucet</span>
//                       <ArrowUpRight className="h-3 w-3" />
//                     </a>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           </TabsContent>

//           {/* Users Tab */}
//           <TabsContent value="users" className="space-y-6">
//             <Card className="border-green-100">
//               <CardHeader>
//                 <CardTitle>User Management</CardTitle>
//                 <CardDescription>Manage consumers, shopkeepers, and delivery agents</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
//                     <Users className="mx-auto h-8 w-8 text-blue-600 mb-2" />
//                     <h3 className="font-semibold">Consumers</h3>
//                     <p className="text-2xl font-bold text-blue-600">
//                       {dashboardData?.totalConsumers || 0}
//                     </p>
//                     <button
//                       onClick={() => router.push('/admin/consumers')}
//                       className="mt-2 text-sm text-blue-600 hover:text-blue-700"
//                     >
//                       Manage →
//                     </button>
//                   </div>
//                   <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
//                     <Building className="mx-auto h-8 w-8 text-green-600 mb-2" />
//                     <h3 className="font-semibold">Shopkeepers</h3>
//                     <p className="text-2xl font-bold text-green-600">
//                       {dashboardData?.totalShopkeepers || 0}
//                     </p>
//                     <button
//                       onClick={() => router.push('/admin/shopkeepers')}
//                       className="mt-2 text-sm text-green-600 hover:text-green-700"
//                     >
//                       Manage →
//                     </button>
//                   </div>
//                   <div className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
//                     <Truck className="mx-auto h-8 w-8 text-purple-600 mb-2" />
//                     <h3 className="font-semibold">Delivery Agents</h3>
//                     <p className="text-2xl font-bold text-purple-600">
//                       {dashboardData?.totalDeliveryAgents || 0}
//                     </p>
//                     <button
//                       onClick={() => router.push('/admin/delivery-agents')}
//                       className="mt-2 text-sm text-purple-600 hover:text-purple-700"
//                     >
//                       Manage →
//                     </button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Tokens Tab */}
//           <TabsContent value="tokens" className="space-y-6">
//             <Card className="border-green-100">
//               <CardHeader>
//                 <CardTitle>Token Management</CardTitle>
//                 <CardDescription>Manage ration tokens and distributions</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//                   <div className="text-center p-4 bg-blue-50 rounded-lg">
//                     <p className="text-sm text-blue-600">Total Issued</p>
//                     <p className="text-2xl font-bold text-blue-700">
//                       {dashboardData?.totalTokensIssued || 0}
//                     </p>
//                   </div>
//                   <div className="text-center p-4 bg-green-50 rounded-lg">
//                     <p className="text-sm text-green-600">Claimed</p>
//                     <p className="text-2xl font-bold text-green-700">
//                       {dashboardData?.totalTokensClaimed || 0}
//                     </p>
//                   </div>
//                   <div className="text-center p-4 bg-amber-50 rounded-lg">
//                     <p className="text-sm text-amber-600">Pending</p>
//                     <p className="text-2xl font-bold text-amber-700">
//                       {dashboardData?.pendingTokens || 0}
//                     </p>
//                   </div>
//                   <div className="text-center p-4 bg-red-50 rounded-lg">
//                     <p className="text-sm text-red-600">Expired</p>
//                     <p className="text-2xl font-bold text-red-700">
//                       {dashboardData?.totalTokensExpired || 0}
//                     </p>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <button
//                       onClick={generateMonthlyTokens}
//                       disabled={generatingTokens.monthly}
//                       className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                     >
//                       <Package className="h-4 w-4" />
//                       {generatingTokens.monthly ? 'Generating...' : 'Generate Monthly Tokens'}
//                     </button>
//                     <button
//                       onClick={generateBPLTokens}
//                       disabled={generatingTokens.bpl}
//                       className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                     >
//                       <Users className="h-4 w-4" />
//                       {generatingTokens.bpl ? 'Generating...' : 'Generate BPL Tokens'}
//                     </button>
//                     <button
//                       onClick={generateAPLTokens}
//                       disabled={generatingTokens.apl}
//                       className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                     >
//                       <UserCheck className="h-4 w-4" />
//                       {generatingTokens.apl ? 'Generating...' : 'Generate APL Tokens'}
//                     </button>
//                   </div>
//                   <button
//                     onClick={() => router.push('/admin/consumers')}
//                     className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
//                   >
//                     <Users className="h-4 w-4" />
//                     Individual Token Management
//                   </button>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Analytics Tab */}
//           <TabsContent value="analytics" className="space-y-6">
//             <Card className="border-green-100">
//               <CardHeader>
//                 <CardTitle>System Analytics</CardTitle>
//                 <CardDescription>Comprehensive system analytics and reports</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-4">
//                     <h3 className="font-semibold">Distribution Analytics</h3>
//                     <button
//                       onClick={() => router.push('/admin/area-stats')}
//                       className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
//                     >
//                       Area-wise Statistics
//                     </button>
//                     <button
//                       onClick={() => router.push('/admin/category-stats')}
//                       className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
//                     >
//                       Category-wise Statistics
//                     </button>
//                   </div>
//                   <div className="space-y-4">
//                     <h3 className="font-semibold">System Reports</h3>
//                     <button
//                       onClick={() => router.push('/admin/emergency-cases')}
//                       className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
//                     >
//                       Emergency Cases
//                     </button>
//                     <button
//                       onClick={() => router.push('/admin/health-report')}
//                       className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
//                     >
//                       System Health Report
//                     </button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </AdminLayout>
//   );
// }








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
  Zap, Activity, Database, RefreshCw
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Token generation loading states
  const [generatingTokens, setGeneratingTokens] = useState({
    monthly: false,
    bpl: false,
    apl: false
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Transaction monitoring
  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent('addTransaction', { detail: txData });
    window.dispatchEvent(event);
  };

  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
    fetchPendingRegistrations();
    fetchRecentActivity();
    fetchSystemHealth();
  }, []);

  // Fetch main dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError('Failed to load dashboard data: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to connect to blockchain');
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
        title: "Delivery Agents",
        value: dashboardData.totalDeliveryAgents?.toString() || "0",
        change: "Active agents",
        icon: Truck,
        color: "bg-orange-50 text-orange-700",
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
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
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
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

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
                      <Badge className="bg-green-100 text-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Online
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
                      0xB58Ec...9c80
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
                  <div className="mt-4">
                    <a 
                      href="https://amoy.polygonscan.com/address/0xB58Ec9EC4a0a8cfFEA29db6099f094a079919c80" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
                    >
                      View on PolygonScan
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>Comprehensive system analytics and reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Distribution Analytics</h3>
                    <button
                      onClick={() => router.push('/admin/area-stats')}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Area-wise Statistics
                    </button>
                    <button
                      onClick={() => router.push('/admin/category-stats')}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                    >
                      Category-wise Statistics
                    </button>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">System Reports</h3>
                    <button
                      onClick={() => router.push('/admin/emergency-cases')}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      Emergency Cases
                    </button>
                    <button
                      onClick={() => router.push('/admin/health-report')}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                    >
                      System Health Report
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}