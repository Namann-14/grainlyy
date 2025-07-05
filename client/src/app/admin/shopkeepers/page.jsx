'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building, Filter, Plus, RefreshCw, MapPin, Users, Package } from "lucide-react";
import { ShopkeeperRegistrationForm } from '@/components/ShopkeeperRegistrationForm';

export default function ShopkeeperManagement() {
  const [shopkeepers, setShopkeepers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blockchainStatus, setBlockchainStatus] = useState(null);

  useEffect(() => {
    fetchShopkeepers();
  }, []);

  const fetchShopkeepers = async () => {
    try {
      setRefreshing(true);
      setError(''); // Clear previous errors
      
      const response = await fetch('/api/admin?endpoint=shopkeepers', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      
      console.log('Shopkeepers API response:', data);
      
      if (data.success) {
        setShopkeepers(data.data || []);
        setBlockchainStatus(data); // Store the full response for status display
        
        // Handle different response scenarios
        if (data.info && data.info.contractIssue) {
          // Contract configuration issue - show detailed explanation
          const { info } = data;
          const detailedMessage = `${data.warning}\n\n` +
            `💡 ${info.explanation}\n\n` +
            `🔧 Solutions:\n${info.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
            `📋 Technical Details:\n` +
            `• Function Selector: ${info.technicalDetails.functionSelector}\n` +
            `• Status: ${info.technicalDetails.currentStatus}\n` +
            `• Total Shopkeepers in Blockchain: ${info.totalShopkeepers}`;
          
          setError(detailedMessage);
        } else if (data.warning) {
          // General warning
          setError(`⚠️ ${data.warning}`);
        } else if (data.error) {
          // Error state
          setError(`❌ Blockchain connection failed: ${data.warning || 'Unknown error'}`);
        } else if (data.data.length === 0) {
          // No data but connection OK
          setError('ℹ️ No shopkeepers registered yet. Use the form below to register the first shopkeeper.');
        } else {
          // Clear any previous errors if data loads successfully
          setError('');
        }
      } else {
        setError('❌ Failed to load shopkeepers: ' + data.error);
        setShopkeepers([]);
      }
    } catch (error) {
      console.error('Error fetching shopkeepers:', error);
      setError('❌ Failed to connect to backend API');
      setShopkeepers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredShopkeepers = shopkeepers.filter(shopkeeper => {
    const matchesSearch = shopkeeper.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopkeeper.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || shopkeeper.area === filterArea;
    return matchesSearch && matchesArea;
  });

  const uniqueAreas = [...new Set(shopkeepers.map(s => s.area))];

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
            <button
              onClick={fetchShopkeepers}
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

        {/* Blockchain Status Card */}
        {blockchainStatus && blockchainStatus.info && blockchainStatus.info.contractIssue && (
          <Card className="border-orange-200 bg-orange-50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Package className="h-5 w-5" />
                Blockchain Status Report
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Current Status</h4>
                  <ul className="space-y-1 text-orange-700">
                    <li>• Contract Connected: ✅</li>
                    <li>• Dashboard Data: ✅ ({blockchainStatus.info.totalShopkeepers} shopkeepers)</li>
                    <li>• getAllShopkeepers(): ❌ Not available</li>
                    <li>• Registration API: ✅ Working</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Technical Details</h4>
                  <ul className="space-y-1 text-orange-700 font-mono text-xs">
                    <li>Contract: {blockchainStatus.contractAddress}</li>
                    <li>Function: {blockchainStatus.info.technicalDetails.functionSelector}</li>
                    <li>Issue: Function not cut in Diamond</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    placeholder="Search by name or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 min-w-[150px]"
                >
                  <option value="all">All Areas</option>
                  {uniqueAreas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
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
                      <th className="text-left p-4 font-medium text-gray-600">Consumers Assigned</th>
                      <th className="text-left p-4 font-medium text-gray-600">Tokens Issued</th>
                      <th className="text-left p-4 font-medium text-gray-600">Total Deliveries</th>
                      <th className="text-left p-4 font-medium text-gray-600">Status</th>
                      <th className="text-left p-4 font-medium text-gray-600">Registered</th>
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
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {shopkeeper.area}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-blue-500" />
                            {shopkeeper.totalConsumersAssigned || 0}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-green-500" />
                            {shopkeeper.totalTokensIssued || 0}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-purple-500" />
                            {shopkeeper.totalDeliveries || 0}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={shopkeeper.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {shopkeeper.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-500">
                            {new Date(shopkeeper.registrationTime * 1000).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopkeeper Registration Form */}
        <Card className="border-green-100 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Register New Shopkeeper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShopkeeperRegistrationForm 
              onSuccess={(message) => {
                setSuccess(message);
                fetchShopkeepers(); // Refresh the list
              }}
              onError={setError}
            />
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Data fetched directly from blockchain • Last updated: {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}