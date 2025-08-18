"use client";
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AdminLayout from '@/components/AdminLayout';
import { Package, User, Clock, MapPin, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export default function OrderAssignmentPage() {
  const [orders, setOrders] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState({});

  useEffect(() => {
    fetchOrders();
    fetchDeliveryAgents();
  }, []);

  // Mock function to fetch orders - in real implementation, this would come from your database
  const fetchOrders = async () => {
    try {
      // For now, we'll create mock orders. In production, this would fetch from your dispatch database
      const mockOrders = [
        {
          id: "ORDER_001",
          dispatchId: "DISPATCH_1704067200_abc123def",
          shopkeeperAddress: "0x1234567890123456789012345678901234567890",
          shopkeeperName: "Ram's Grocery Store",
          rationDetails: {
            type: "Rice",
            quantity: 50,
            unit: "kg"
          },
          estimatedDeliveryTime: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
          status: "pending",
          assignedAgent: null,
          createdAt: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
        },
        {
          id: "ORDER_002", 
          dispatchId: "DISPATCH_1704067300_def456ghi",
          shopkeeperAddress: "0x2345678901234567890123456789012345678901",
          shopkeeperName: "Sharma Provisions",
          rationDetails: {
            type: "Wheat",
            quantity: 30,
            unit: "kg"
          },
          estimatedDeliveryTime: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
          status: "pending",
          assignedAgent: null,
          createdAt: Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago
        },
        {
          id: "ORDER_003",
          dispatchId: "DISPATCH_1704067400_ghi789jkl", 
          shopkeeperAddress: "0x3456789012345678901234567890123456789012",
          shopkeeperName: "Gupta Store",
          rationDetails: {
            type: "Pulses",
            quantity: 25,
            unit: "kg"
          },
          estimatedDeliveryTime: Date.now() + 18 * 60 * 60 * 1000, // 18 hours
          status: "assigned",
          assignedAgent: "0x4567890123456789012345678901234567890123",
          createdAt: Date.now() - 30 * 60 * 1000 // 30 minutes ago
        }
      ];
      
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchDeliveryAgents = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-delivery-agents');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Filter only active delivery agents
        const activeAgents = data.data.filter(agent => agent.isActive);
        setDeliveryAgents(activeAgents);
        console.log(`✅ Found ${activeAgents.length} active delivery agents`);
      } else {
        setDeliveryAgents([]);
        console.log("⚠️ No delivery agents found");
      }
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
      setDeliveryAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelection = (orderId, agentAddress) => {
    setSelectedAgents(prev => ({
      ...prev,
      [orderId]: agentAddress
    }));
  };

  const assignDeliveryAgent = async (order) => {
    const agentAddress = selectedAgents[order.id];
    if (!agentAddress) {
      alert('Please select a delivery agent first');
      return;
    }

    setAssigning(true);
    try {
      // Call the admin API route that handles delivery agent assignment
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'assign-delivery-agent',
          orderId: order.id, // Use order ID as the identifier
          agentAddress: agentAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Delivery agent assigned successfully!\nTransaction: ${result.txHash}`);
        
        // Update local state
        setOrders(prev => prev.map(o => 
          o.id === order.id 
            ? { ...o, status: 'assigned', assignedAgent: agentAddress }
            : o
        ));

        // Clear selection
        setSelectedAgents(prev => ({
          ...prev,
          [order.id]: ''
        }));
      } else {
        alert(`❌ Failed to assign delivery agent: ${result.error}`);
      }
    } catch (error) {
      console.error('Error assigning delivery agent:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const assignedOrders = orders.filter(order => order.status === 'assigned');

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading orders and delivery agents...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Order Assignment</h1>
          <p className="text-muted-foreground">
            Assign delivery agents to pending orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <AlertCircle className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{assignedOrders.length}</p>
                <p className="text-sm font-medium text-gray-600">Assigned Orders</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Truck className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{deliveryAgents.length}</p>
                <p className="text-sm font-medium text-gray-600">Available Agents</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Package className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pending Orders ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No pending orders found</p>
                <p className="text-sm mt-2">All orders have been assigned to delivery agents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 bg-orange-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Order Info */}
                      <div>
                        <h3 className="font-semibold text-lg">{order.shopkeeperName}</h3>
                        <p className="text-sm text-gray-600">Order ID: {order.id}</p>
                        <p className="text-sm text-gray-600">
                          Shopkeeper: {order.shopkeeperAddress.slice(0, 8)}...{order.shopkeeperAddress.slice(-6)}
                        </p>
                      </div>
                      
                      {/* Ration Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{order.rationDetails.type}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Quantity: {order.rationDetails.quantity} {order.rationDetails.unit}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Due: {new Date(order.estimatedDeliveryTime).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Agent Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Delivery Agent
                        </label>
                        <select
                          value={selectedAgents[order.id] || ''}
                          onChange={(e) => handleAgentSelection(order.id, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Choose Agent</option>
                          {deliveryAgents.map((agent) => (
                            <option key={agent.agentAddress} value={agent.agentAddress}>
                              {agent.name} - {agent.mobile}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex items-end">
                        <button
                          onClick={() => assignDeliveryAgent(order)}
                          disabled={!selectedAgents[order.id] || assigning}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          {assigning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                              Assigning...
                            </>
                          ) : (
                            <>
                              <Truck className="h-4 w-4" />
                              Assign Agent
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Orders Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Assigned Orders ({assignedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No assigned orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((order) => {
                  const assignedAgent = deliveryAgents.find(agent => agent.agentAddress === order.assignedAgent);
                  return (
                    <div key={order.id} className="border rounded-lg p-4 bg-green-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Order Info */}
                        <div>
                          <h3 className="font-semibold text-lg">{order.shopkeeperName}</h3>
                          <p className="text-sm text-gray-600">Order ID: {order.id}</p>
                          <Badge className="mt-1 bg-green-100 text-green-800">Assigned</Badge>
                        </div>
                        
                        {/* Ration Details */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{order.rationDetails.type}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.rationDetails.quantity} {order.rationDetails.unit}
                          </p>
                        </div>
                        
                        {/* Assigned Agent */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">
                              {assignedAgent ? assignedAgent.name : 'Unknown Agent'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {assignedAgent ? assignedAgent.mobile : order.assignedAgent.slice(0, 8) + '...'}
                          </p>
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(order.estimatedDeliveryTime).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>💡 Orders are automatically created when ration dispatches are initiated</p>
          <p>Use this page to assign delivery agents to pending orders using the blockchain assignDeliveryAgent function</p>
        </div>
      </div>
    </AdminLayout>
  );
}
