'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, RefreshCw, Phone, User, Calendar, Package, Zap } from "lucide-react";

export default function EmergencyCases() {
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmergencyCases();
  }, []);

  const fetchEmergencyCases = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=emergency-cases');
      const data = await response.json();
      
      if (data.success) {
        setEmergencyCases(data.data);
      } else {
        setError('Failed to load emergency cases: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
      setError('Failed to fetch emergency cases from blockchain');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTokenForConsumer = async (aadhaar) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin?endpoint=generate-token-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aadhaar }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add transaction to monitor
        const event = new CustomEvent('addTransaction', { 
          detail: {
            hash: data.txHash,
            type: 'Emergency Token Generation',
            details: `Token for Aadhaar: ${aadhaar}`,
            polygonScanUrl: data.polygonScanUrl
          }
        });
        window.dispatchEvent(event);

        setSuccess(`✅ Emergency token generated for Aadhaar ${aadhaar}! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        // Refresh emergency cases after some time
        setTimeout(() => {
          fetchEmergencyCases();
        }, 15000);
      } else {
        setError(`❌ Failed to generate token: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setError('Failed to generate emergency token');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = emergencyCases.filter(consumer => 
    consumer.aadhaar.toString().includes(searchTerm) ||
    consumer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consumer.mobile.includes(searchTerm)
  );

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && emergencyCases.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading emergency cases from blockchain...</p>
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
              <h1 className="text-3xl font-bold text-green-900">Emergency Cases</h1>
              <p className="text-muted-foreground">
                Consumers needing immediate assistance and emergency token generation
              </p>
            </div>
            <button
              onClick={fetchEmergencyCases}
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

        {/* Alert Banner */}
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Emergency Alert System</h3>
                <p className="text-sm text-red-700">
                  This page shows consumers who need immediate assistance. These cases require urgent action.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Emergency Cases</p>
                  <p className="text-2xl font-bold text-red-600">{emergencyCases.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Cases</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {emergencyCases.filter(c => !c.hasCurrentMonthToken).length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">BPL Category</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {emergencyCases.filter(c => c.category === 'BPL').length}
                  </p>
                </div>
                <User className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Long Overdue</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {emergencyCases.filter(c => 
                      Date.now() - (c.lastTokenIssuedTime * 1000) > (60 * 24 * 60 * 60 * 1000)
                    ).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-green-100 mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by Aadhaar number, name, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Cases List */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Emergency Cases Requiring Immediate Action ({filteredCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="text-center py-8">
                {emergencyCases.length === 0 ? (
                  <>
                    <AlertTriangle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                    <p className="text-green-600 font-medium">No Emergency Cases! 🎉</p>
                    <p className="text-sm text-gray-500 mt-2">
                      All consumers are up to date with their tokens
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No emergency cases match your search</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Try adjusting your search criteria
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCases.map((consumer, index) => {
                  const daysSinceLastToken = Math.floor(
                    (Date.now() - (consumer.lastTokenIssuedTime * 1000)) / (24 * 60 * 60 * 1000)
                  );
                  const urgencyLevel = daysSinceLastToken > 60 ? 'critical' : 
                                     daysSinceLastToken > 30 ? 'high' : 'medium';
                  
                  return (
                    <div key={index} className={`border rounded-lg p-6 ${
                      urgencyLevel === 'critical' ? 'border-red-300 bg-red-50' :
                      urgencyLevel === 'high' ? 'border-orange-300 bg-orange-50' :
                      'border-yellow-300 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{consumer.name}</h3>
                            <Badge className={
                              urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' :
                              urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {urgencyLevel.toUpperCase()} PRIORITY
                            </Badge>
                            <Badge className={consumer.category === 'BPL' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                              {consumer.category}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Aadhaar:</span>
                              <code className="bg-white px-2 py-1 rounded">{consumer.aadhaar}</code>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Mobile:</span>
                              <span className="font-medium">{consumer.mobile}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Last Token:</span>
                              <span className="font-medium">
                                {consumer.lastTokenIssuedTime ? formatDate(consumer.lastTokenIssuedTime) : 'Never'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Days Overdue:</span>
                              <span className={`font-medium ${
                                daysSinceLastToken > 60 ? 'text-red-600' :
                                daysSinceLastToken > 30 ? 'text-orange-600' : 'text-yellow-600'
                              }`}>
                                {daysSinceLastToken} days
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => generateTokenForConsumer(consumer.aadhaar)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2 ml-4"
                        >
                          <Zap className="h-4 w-4" />
                          {loading ? 'Generating...' : 'Generate Emergency Token'}
                        </button>
                      </div>
                      
                      {/* Additional Details */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Total Tokens Received:</span>
                            <span className="font-medium ml-2">{consumer.totalTokensReceived}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Tokens Claimed:</span>
                            <span className="font-medium ml-2">{consumer.totalTokensClaimed}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Registration Date:</span>
                            <span className="font-medium ml-2">
                              {formatDate(consumer.registrationTime)}
                            </span>
                          </div>
                        </div>
                        
                        {consumer.assignedShopkeeper !== '0x0000000000000000000000000000000000000000' && (
                          <div className="mt-2">
                            <span className="text-gray-600">Assigned Shopkeeper:</span>
                            <code className="bg-white px-2 py-1 rounded ml-2 text-xs">
                              {consumer.assignedShopkeeper.slice(0, 10)}...{consumer.assignedShopkeeper.slice(-8)}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        {emergencyCases.length > 0 && (
          <Card className="border-green-100 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Emergency Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Immediate Actions Required</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Generate emergency tokens for critical cases (60+ days overdue)</li>
                    <li>• Contact consumers via phone to verify current status</li>
                    <li>• Coordinate with assigned shopkeepers for immediate distribution</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Follow-up Actions</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Monitor token generation status on blockchain</li>
                    <li>• Verify successful distribution and consumption</li>
                    <li>• Update consumer records and contact information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Emergency data fetched directly from blockchain • Last updated: {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}