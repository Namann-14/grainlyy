"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
// import { Progress } from "@/components/ui/progress";
import { 
  Truck, 
  Package, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye,
  Activity,
  X,
  EyeOff,
  Archive
} from "lucide-react";

export default function PickupManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Data states
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [blockchainPickups, setBlockchainPickups] = useState([]);
  const [realTimeStatuses, setRealTimeStatuses] = useState({});
  
  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    deliveryAgent: "",
    shopkeeper: "",
    rationAmount: "",
    category: "BPL",
    pickupLocation: "",
    deliveryInstructions: ""
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState("assign");
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedPickupId, setSelectedPickupId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [hiddenPickups, setHiddenPickups] = useState(new Set());

  useEffect(() => {
    fetchInitialData();
    
    // Set up auto-refresh for real-time status updates
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchBlockchainPickups();
        fetchPickupStatistics();
      }, 10000); // Refresh every 10 seconds
      
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    // Fetch blockchain data when component mounts
    fetchBlockchainPickups();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDeliveryAgents(),
        fetchShopkeepers(),
        fetchPickupStatistics(),
        fetchAllPickups(),
        fetchBlockchainPickups()
      ]);
    } catch (error) {
      setError("Failed to load initial data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryAgents = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-delivery-agents');
      const result = await response.json();
      if (result.success) {
        setDeliveryAgents(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching delivery agents:", error);
    }
  };

  const fetchShopkeepers = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-shopkeepers');
      const result = await response.json();
      if (result.success) {
        setShopkeepers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching shopkeepers:", error);
    }
  };

  const fetchPickupStatistics = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=pickup-statistics');
      const result = await response.json();
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error("Error fetching pickup statistics:", error);
    }
  };

  const fetchAllPickups = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=all-pickups');
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        // Only set legacy pickups if we actually have real data, not mock data
        const realPickups = result.data.filter(pickup => 
          pickup.deliveryAgentName !== "John Doe" && pickup.shopkeeperName !== "Shop ABC"
        );
        setPickups(realPickups);
      } else {
        setPickups([]);
      }
    } catch (error) {
      console.error("Error fetching pickups:", error);
      setPickups([]);
    }
  };

  // Blockchain integration functions
  const fetchBlockchainPickups = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Fix for ethers v6
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Import the ABI dynamically to avoid import issues
        const DiamondABI = await import('../../../../abis/DiamondMergedABI.json');
        const contractAddress = DiamondABI.metadata?.deploymentAddresses?.Diamond;
        
        if (!contractAddress) {
          console.warn("Contract address not found in ABI metadata");
          return;
        }
        
        const contract = new ethers.Contract(contractAddress, DiamondABI.abiMap?.RationPickupFacet || [], signer);
        
        // Get pickup statistics
        const stats = await contract.getPickupStatistics();
        
        // Convert BigInt to numbers for ethers v6
        const blockchainStats = {
          totalPickups: Number(stats.totalPickups),
          pendingPickups: Number(stats.pendingPickups),
          completedPickups: Number(stats.completedPickups),
          activeAgents: Number(stats.activeAgents),
          activeShopkeepers: Number(stats.activeShopkeepers)
        };
        
        setStatistics(blockchainStats);
        
        // Fetch individual pickup details for recent pickups
        const recentPickups = [];
        const pickupCount = Math.min(Number(stats.totalPickups), 20); // Limit to last 20 pickups
        
        if (pickupCount > 0) {
          for (let i = Math.max(1, Number(stats.totalPickups) - 19); i <= Number(stats.totalPickups); i++) {
            try {
              const pickupDetails = await contract.getPickupDetails(i);
              recentPickups.push({
                pickupId: Number(pickupDetails.pickupId),
                deliveryAgent: pickupDetails.deliveryAgent,
                shopkeeper: pickupDetails.shopkeeper,
                rationAmount: Number(pickupDetails.rationAmount),
                category: pickupDetails.category,
                status: Number(pickupDetails.status),
                assignedTime: Number(pickupDetails.assignedTime),
                pickedUpTime: Number(pickupDetails.pickedUpTime),
                deliveredTime: Number(pickupDetails.deliveredTime),
                confirmedTime: Number(pickupDetails.confirmedTime),
                pickupLocation: pickupDetails.pickupLocation,
                deliveryInstructions: pickupDetails.deliveryInstructions,
                isCompleted: pickupDetails.isCompleted
              });
            } catch (err) {
              console.error(`Error fetching pickup ${i}:`, err);
            }
          }
        }
        
        setBlockchainPickups(recentPickups);
        
        // Update real-time statuses
        const statusMap = {};
        recentPickups.forEach(pickup => {
          statusMap[pickup.pickupId] = pickup.status;
        });
        setRealTimeStatuses(statusMap);
        
      } else {
        console.warn("MetaMask not found or window.ethereum not available");
        // Fallback to demo data for testing - showing various status stages
        const demoPickups = [
          {
            pickupId: 1,
            deliveryAgent: "0x1234567890123456789012345678901234567890",
            shopkeeper: "0x0987654321098765432109876543210987654321",
            rationAmount: 50,
            category: "BPL",
            status: 3, // Delivered (Final Stage)
            assignedTime: Math.floor(Date.now() / 1000) - 7200,
            pickedUpTime: Math.floor(Date.now() / 1000) - 5400,
            deliveredTime: Math.floor(Date.now() / 1000) - 3600,
            confirmedTime: 0, // Not used anymore
            pickupLocation: "Central Warehouse A",
            deliveryInstructions: "Demo pickup - Successfully delivered",
            isCompleted: true
          },
          {
            pickupId: 2,
            deliveryAgent: "0x2345678901234567890123456789012345678901",
            shopkeeper: "0x1987654321098765432109876543210987654321",
            rationAmount: 75,
            category: "APL",
            status: 2, // In Transit
            assignedTime: Math.floor(Date.now() / 1000) - 3600,
            pickedUpTime: Math.floor(Date.now() / 1000) - 1800,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: "Warehouse B",
            deliveryInstructions: "Demo pickup - Currently in transit",
            isCompleted: false
          },
          {
            pickupId: 3,
            deliveryAgent: "0x3456789012345678901234567890123456789012",
            shopkeeper: "0x2987654321098765432109876543210987654321",
            rationAmount: 25,
            category: "AAY",
            status: 1, // Picked Up
            assignedTime: Math.floor(Date.now() / 1000) - 1800,
            pickedUpTime: Math.floor(Date.now() / 1000) - 900,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: "Warehouse C",
            deliveryInstructions: "Demo pickup - Recently picked up",
            isCompleted: false
          },
          {
            pickupId: 4,
            deliveryAgent: "0x4567890123456789012345678901234567890123",
            shopkeeper: "0x3987654321098765432109876543210987654321",
            rationAmount: 100,
            category: "BPL",
            status: 0, // Just Assigned
            assignedTime: Math.floor(Date.now() / 1000) - 600,
            pickedUpTime: 0,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: "Warehouse D",
            deliveryInstructions: "Demo pickup - Recently assigned",
            isCompleted: false
          }
        ];
        setBlockchainPickups(demoPickups);
        setStatistics({
          totalPickups: 4,
          pendingPickups: 3,
          completedPickups: 1,
          activeAgents: 4,
          activeShopkeepers: 4
        });
      }
    } catch (error) {
      console.error("Error fetching blockchain pickups:", error);
      // Fallback to demo data on error - showing different status stages
      const demoPickups = [
        {
          pickupId: 1,
          deliveryAgent: "0x1234567890123456789012345678901234567890",
          shopkeeper: "0x0987654321098765432109876543210987654321",
          rationAmount: 50,
          category: "BPL",
          status: 3, // Delivered (Final Stage)
          assignedTime: Math.floor(Date.now() / 1000) - 5400,
          pickedUpTime: Math.floor(Date.now() / 1000) - 3600,
          deliveredTime: Math.floor(Date.now() / 1000) - 1800,
          confirmedTime: 0, // Not used anymore
          pickupLocation: "Central Warehouse",
          deliveryInstructions: "Demo pickup - Successfully delivered",
          isCompleted: true
        },
        {
          pickupId: 2,
          deliveryAgent: "0x2345678901234567890123456789012345678901",
          shopkeeper: "0x1987654321098765432109876543210987654321",
          rationAmount: 30,
          category: "APL",
          status: 1, // Picked Up
          assignedTime: Math.floor(Date.now() / 1000) - 2700,
          pickedUpTime: Math.floor(Date.now() / 1000) - 1800,
          deliveredTime: 0,
          confirmedTime: 0,
          pickupLocation: "East Warehouse",
          deliveryInstructions: "Demo pickup - Agent en route to shopkeeper",
          isCompleted: false
        }
      ];
      setBlockchainPickups(demoPickups);
      setStatistics({
        totalPickups: 2,
        pendingPickups: 2,
        completedPickups: 0,
        activeAgents: 2,
        activeShopkeepers: 2
      });
    }
  };

  const getPickupProgress = (status) => {
    const progressMap = {
      0: 25, // Assigned
      1: 50, // Picked Up
      2: 75, // In Transit  
      3: 100 // Delivered (Final Stage)
    };
    return progressMap[status] || 0;
  };

  const getStatusTimeline = (pickup) => {
    const timeline = [
      { label: "Assigned", time: pickup.assignedTime, completed: pickup.status >= 0 },
      { label: "Picked Up", time: pickup.pickedUpTime, completed: pickup.status >= 1 },
      { label: "In Transit", time: 0, completed: pickup.status >= 2 },
      { label: "Delivered", time: pickup.deliveredTime, completed: pickup.status >= 3 }
    ];
    return timeline;
  };

  const handleAssignPickup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/admin/assign-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentForm)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Pickup assigned successfully! Pickup ID: ${result.pickupId}`);
        setAssignmentForm({
          deliveryAgent: "",
          shopkeeper: "",
          rationAmount: "",
          category: "BPL",
          pickupLocation: "",
          deliveryInstructions: ""
        });
        await fetchAllPickups();
        await fetchPickupStatistics();
        await fetchBlockchainPickups(); // Refresh blockchain data too
      } else {
        setError(result.error || "Failed to assign pickup");
      }
    } catch (error) {
      setError("Failed to assign pickup: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: "Assigned", color: "bg-blue-100 text-blue-800", icon: Clock },
      1: { label: "Picked Up", color: "bg-yellow-100 text-yellow-800", icon: Package },
      2: { label: "In Transit", color: "bg-orange-100 text-orange-800", icon: Truck },
      3: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle }
    };
    
    const statusInfo = statusMap[status] || { label: "Unknown", color: "bg-gray-100 text-gray-800", icon: AlertTriangle };
    const IconComponent = statusInfo.icon;
    
    return (
      <Badge className={`${statusInfo.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  const handleHidePickup = (pickupId) => {
    setHiddenPickups(prev => new Set([...prev, pickupId]));
  };

  const handleShowPickup = (pickupId) => {
    setHiddenPickups(prev => {
      const newSet = new Set(prev);
      newSet.delete(pickupId);
      return newSet;
    });
  };

  const getFilteredPickups = () => {
    return blockchainPickups.filter(pickup => {
      // Always show non-completed pickups
      if (pickup.status < 3) return !hiddenPickups.has(pickup.pickupId);
      
      // For completed pickups, only show if showCompleted is true
      if (pickup.status === 3) {
        return showCompleted && !hiddenPickups.has(pickup.pickupId);
      }
      
      return !hiddenPickups.has(pickup.pickupId);
    });
  };

  const getCompletedPickups = () => {
    return blockchainPickups.filter(pickup => pickup.status === 3);
  };

  const getActivePickups = () => {
    return blockchainPickups.filter(pickup => pickup.status < 3);
  };

  if (loading && !statistics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Truck className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading pickup management...</p>
            <p className="text-sm text-gray-500 mt-2">Connecting to blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto py-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pickup Management</h1>
            <p className="text-gray-600 mt-1">Assign and manage ration pickups for delivery agents</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button
              onClick={fetchBlockchainPickups}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowBulkAssign(!showBulkAssign)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Bulk Assign
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics.pendingPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.completedPickups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.activeAgents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.activeShopkeepers}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Assign New Pickup</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignPickup} className="space-y-4">
                <div>
                  <Label htmlFor="deliveryAgent" className="mb-2">Delivery Agent</Label>
                  <Select
                    value={assignmentForm.deliveryAgent}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, deliveryAgent: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select delivery agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryAgents.map((agent) => (
                        <SelectItem key={agent.agentAddress} value={agent.agentAddress}>
                          {agent.name} - {agent.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="shopkeeper" className="mb-2">Shopkeeper</Label>
                  <Select
                    value={assignmentForm.shopkeeper}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, shopkeeper: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shopkeeper" />
                    </SelectTrigger>
                    <SelectContent>
                      {shopkeepers.map((shop) => (
                        <SelectItem key={shop.shopkeeperAddress} value={shop.shopkeeperAddress}>
                          {shop.name} - {shop.area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rationAmount" className="mb-2">Ration Amount (kg)</Label>
                  <Input
                    id="rationAmount"
                    type="number"
                    value={assignmentForm.rationAmount}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, rationAmount: e.target.value }))}
                    placeholder="Enter amount in kg"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="mb-2">Category</Label>
                  <Select
                    value={assignmentForm.category}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BPL">BPL</SelectItem>
                      <SelectItem value="APL">APL</SelectItem>
                      <SelectItem value="AAY">AAY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pickupLocation" className="mb-2">Pickup Location</Label>
                  <Input
                    id="pickupLocation"
                    value={assignmentForm.pickupLocation}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    placeholder="Enter pickup location"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryInstructions" className="mb-2">Delivery Instructions</Label>
                  <Textarea
                    id="deliveryInstructions"
                    value={assignmentForm.deliveryInstructions}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                    placeholder="Enter any special instructions"
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading || !assignmentForm.deliveryAgent || !assignmentForm.shopkeeper}
                >
                  {loading ? "Assigning..." : "Assign Pickup"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Real-time Pickups List with Status Tracking */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Real-time Pickup Tracking</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {getActivePickups().length} Active
                </Badge>
                {getCompletedPickups().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getCompletedPickups().length} Completed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {autoRefresh ? 'Live' : 'Static'}
                </Badge>
                {getCompletedPickups().length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1"
                  >
                    {showCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showCompleted ? 'Hide' : 'Show'} Delivered
                  </Button>
                )}
                {selectedPickupId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPickupId(null)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getFilteredPickups().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {blockchainPickups.length === 0 ? (
                      <>
                        <p>No pickups found on blockchain</p>
                        <p className="text-sm">Pickups will appear here once assigned through smart contract</p>
                      </>
                    ) : (
                      <>
                        <p>No active pickups to display</p>
                        <p className="text-sm">
                          {getCompletedPickups().length > 0 && !showCompleted && 
                            `${getCompletedPickups().length} completed pickup(s) hidden. Click "Show Delivered" to view them.`
                          }
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  getFilteredPickups().map((pickup) => (
                    <motion.div 
                      key={pickup.pickupId} 
                      className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">
                            #{pickup.pickupId}
                          </Badge>
                          {getStatusBadge(pickup.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPickupId(
                              selectedPickupId === pickup.pickupId ? null : pickup.pickupId
                            )}
                            className="h-6 px-2"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">
                            {new Date(pickup.assignedTime * 1000).toLocaleDateString()}
                          </div>
                          {pickup.status === 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleHidePickup(pickup.pickupId)}
                              className="h-6 px-2 text-gray-400 hover:text-red-600"
                              title="Hide this completed pickup"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Progress</span>
                          <span>{getPickupProgress(pickup.status)}%</span>
                        </div>
                        <Progress 
                          value={getPickupProgress(pickup.status)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Agent:</span> {pickup.deliveryAgent.slice(0, 6)}...{pickup.deliveryAgent.slice(-4)}
                        </div>
                        <div>
                          <span className="font-medium">Shop:</span> {pickup.shopkeeper.slice(0, 6)}...{pickup.shopkeeper.slice(-4)}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> {pickup.rationAmount} kg
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {pickup.category}
                        </div>
                      </div>

                      {pickup.pickupLocation && (
                        <div className="text-sm">
                          <span className="font-medium">Location:</span> {pickup.pickupLocation}
                        </div>
                      )}

                      {/* Detailed Timeline View */}
                      {selectedPickupId === pickup.pickupId && (
                        <motion.div 
                          className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-3"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <h4 className="font-semibold mb-3">Status Timeline</h4>
                          <div className="space-y-3">
                            {getStatusTimeline(pickup).map((step, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  step.completed ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className={`text-sm ${
                                      step.completed ? 'text-green-700 font-medium' : 'text-gray-500'
                                    }`}>
                                      {step.label}
                                    </span>
                                    {step.time > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {new Date(step.time * 1000).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {step.completed && index < getStatusTimeline(pickup).length - 1 && (
                                    <div className="w-px h-4 bg-green-300 ml-1 mt-1" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {pickup.deliveryInstructions && (
                            <div className="mt-4 pt-3 border-t">
                              <h5 className="font-medium text-sm mb-1">Delivery Instructions</h5>
                              <p className="text-sm text-gray-600">{pickup.deliveryInstructions}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden Pickups Section - Show if there are any hidden pickups */}
        {hiddenPickups.size > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Hidden Completed Pickups</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {hiddenPickups.size} Hidden
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHiddenPickups(new Set())}
                className="flex items-center gap-1"
              >
                <Archive className="h-4 w-4" />
                Restore All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockchainPickups
                  .filter(pickup => hiddenPickups.has(pickup.pickupId))
                  .map((pickup) => (
                    <div key={pickup.pickupId} className="border rounded-lg p-3 bg-gray-50 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{pickup.pickupId}
                          </Badge>
                          {getStatusBadge(pickup.status)}
                          <span className="text-sm text-gray-600">
                            {pickup.rationAmount} kg {pickup.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Delivered: {new Date(pickup.deliveredTime * 1000).toLocaleDateString()}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowPickup(pickup.pickupId)}
                            className="h-6 px-2 text-green-600 hover:text-green-700"
                            title="Restore this pickup to main view"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legacy Pickups Section - Show if there are any database pickups */}
        {pickups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Legacy Database Pickups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pickups.slice(0, 10).map((pickup) => (
                  <div key={pickup.pickupId} className="border rounded-lg p-4 space-y-2 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{pickup.pickupId}</Badge>
                        {getStatusBadge(pickup.status)}
                        <Badge variant="secondary" className="text-xs">Database</Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(pickup.assignedTime * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Agent:</span> {pickup.deliveryAgentName || "Unknown"}
                      </div>
                      <div>
                        <span className="font-medium">Shop:</span> {pickup.shopkeeperName || "Unknown"}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> {pickup.rationAmount} kg
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {pickup.category}
                      </div>
                    </div>
                    
                    {pickup.pickupLocation && (
                      <div className="text-sm">
                        <span className="font-medium">Location:</span> {pickup.pickupLocation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}