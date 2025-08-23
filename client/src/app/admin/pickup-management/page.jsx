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
  Filter
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDeliveryAgents(),
        fetchShopkeepers(),
        fetchPickupStatistics(),
        fetchAllPickups()
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
      if (result.success) {
        setPickups(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pickups:", error);
    }
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
      0: { label: "Assigned", color: "bg-blue-100 text-blue-800" },
      1: { label: "Picked Up", color: "bg-yellow-100 text-yellow-800" },
      2: { label: "In Transit", color: "bg-orange-100 text-orange-800" },
      3: { label: "Delivered", color: "bg-green-100 text-green-800" },
      4: { label: "Confirmed", color: "bg-green-100 text-green-800" }
    };
    
    const statusInfo = statusMap[status] || { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (loading && !statistics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Truck className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading pickup management...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pickup Management</h1>
            <p className="text-gray-600 mt-1">Assign and manage ration pickups for delivery agents</p>
          </div>
          <Button
            onClick={() => setShowBulkAssign(!showBulkAssign)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Bulk Assign
          </Button>
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
                  <Label htmlFor="deliveryAgent">Delivery Agent</Label>
                  <Select
                    value={assignmentForm.deliveryAgent}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, deliveryAgent: value }))}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="shopkeeper">Shopkeeper</Label>
                  <Select
                    value={assignmentForm.shopkeeper}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, shopkeeper: value }))}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="rationAmount">Ration Amount (kg)</Label>
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
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={assignmentForm.category}
                    onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="pickupLocation">Pickup Location</Label>
                  <Input
                    id="pickupLocation"
                    value={assignmentForm.pickupLocation}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                    placeholder="Enter pickup location"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
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

          {/* Pickups List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Pickups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pickups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pickups assigned yet</p>
                  </div>
                ) : (
                  pickups.slice(0, 10).map((pickup) => (
                    <div key={pickup.pickupId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{pickup.pickupId}</Badge>
                          {getStatusBadge(pickup.status)}
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}