"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Phone, 
  User, 
  MapPin, 
  CreditCard, 
  Hash,
  Calendar,
  Search,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ConsumerRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/consumer-signup?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setRequests(data.requests);
        setTotalPages(data.pagination.pages);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch consumer requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRequests();
  };

  const approveConsumer = async (request) => {
    const requestId = request._id;
    setProcessing(prev => ({...prev, [requestId]: true}));

    try {
      // Register consumer on blockchain
      const registrationResponse = await fetch('/api/admin/register-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: request.aadharNumber,
          name: request.name,
          mobile: request.phone,
          category: 'BPL', // Default category - you can make this configurable
          shopkeeperAddress: "0x0000000000000000000000000000000000000000" // No shopkeeper assigned initially
        }),
      });

      const registrationData = await registrationResponse.json();

      if (registrationData.success) {
        // Update request status in database (you'll need to create this endpoint)
        const updateResponse = await fetch('/api/consumer-signup/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            status: 'approved',
            txHash: registrationData.txHash
          }),
        });

        if (updateResponse.ok) {
          toast({
            title: "Success",
            description: `Consumer ${request.name} approved and registered on blockchain`,
          });
          
          // Send SMS notification (you can implement this)
          
          fetchRequests(); // Refresh the list
        } else {
          throw new Error('Failed to update request status');
        }
      } else {
        throw new Error(registrationData.error || 'Blockchain registration failed');
      }

    } catch (error) {
      console.error('Error approving consumer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve consumer",
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => ({...prev, [requestId]: false}));
    }
  };

  const rejectConsumer = async (request) => {
    const requestId = request._id;
    setProcessing(prev => ({...prev, [requestId]: true}));

    try {
      const response = await fetch('/api/consumer-signup/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          status: 'rejected',
          reason: 'Rejected by admin'
        }),
      });

      if (response.ok) {
        toast({
          title: "Request Rejected",
          description: `Consumer request for ${request.name} has been rejected`,
        });
        
        fetchRequests(); // Refresh the list
      } else {
        throw new Error('Failed to reject request');
      }

    } catch (error) {
      console.error('Error rejecting consumer:', error);
      toast({
        title: "Error",
        description: "Failed to reject consumer request",
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => ({...prev, [requestId]: false}));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading consumer requests...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Consumer Signup Requests</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, phone, or Aadhaar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No consumer requests found for the selected filters.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request._id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {request.name}
                      {getStatusBadge(request.status)}
                    </CardTitle>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4" />
                      Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveConsumer(request)}
                        disabled={processing[request._id]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing[request._id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectConsumer(request)}
                        disabled={processing[request._id]}
                      >
                        {processing[request._id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Phone:</span> {request.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Address:</span> {request.homeAddress}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Ration Card:</span> {request.rationCardId}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Aadhaar:</span> {request.aadharNumber}
                    </div>
                  </div>
                </div>
                
                {request.status === 'approved' && request.txHash && (
                  <div className="mt-4 p-3 bg-green-50 rounded border">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Registered on blockchain: 
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${request.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 underline hover:no-underline"
                      >
                        {request.txHash?.substring(0, 10)}...
                      </a>
                    </p>
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="mt-4 p-3 bg-red-50 rounded border">
                    <p className="text-sm text-red-800">
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Request rejected: {request.rejectionReason || 'No reason provided'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
