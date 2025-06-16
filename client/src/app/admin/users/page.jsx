"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/AdminLayout';

import { Users, UserCheck, UserX, Clock, ArrowUpRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ConsumerSignupRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/consumer-signup?status=${filter}`);
      const data = await response.json();
      setRequests(data.requests);
      
      // Calculate stats
      const allResponse = await fetch('/api/consumer-signup?status=all');
      const allData = await allResponse.json();
      const allRequests = allData.requests;
      
      setStats({
        pending: allRequests.filter(r => r.status === 'pending').length,
        approved: allRequests.filter(r => r.status === 'approved').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length,
        total: allRequests.length
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action, adminNote = '') => {
    try {
      const response = await fetch(`/api/consumer-signup/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          adminNote,
          adminId: '69420' // Replace with actual admin ID
        }),
      });

      if (response.ok) {
        fetchRequests(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading consumer signup requests...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Consumer Signup Requests</h1>
          <p className="text-muted-foreground">
            Review and manage consumer registration requests.
          </p>
        </div>

        {/* Stats Overview */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <div className="rounded-full p-2 bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <div className="rounded-full p-2 bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <div className="rounded-full p-2 bg-green-100">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <div className="rounded-full p-2 bg-red-100">
                  <UserX className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-full">
            <div className="bg-white border border-green-100 rounded-lg p-1 inline-flex">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === status 
                      ? 'bg-green-50 text-green-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {requests.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-green-100 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">No consumer signup requests match the current filter.</p>
            </div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request._id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bg-white shadow-sm rounded-lg border border-green-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-green-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{request.name}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted on {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Contact Information</p>
                          <p className="text-sm text-gray-900">{request.email}</p>
                          <p className="text-sm text-gray-900">{request.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Address</p>
                          <p className="text-sm text-gray-900">{request.homeAddress}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Documents</p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Ration Card:</span> {request.rationCardId}
                          </p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Aadhar:</span> {request.aadharNumber}
                          </p>
                        </div>
                        {request.familySize && (
                          <div>
                            <p className="text-sm font-medium text-gray-600">Family Size</p>
                            <p className="text-sm text-gray-900">{request.familySize}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {request.adminNote && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-600">Admin Note:</p>
                        <p className="text-sm text-gray-900 mt-1">{request.adminNote}</p>
                        {request.reviewedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed on {formatDate(request.reviewedAt)} by {request.reviewedBy}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => handleAction(request._id, 'approve')}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                          >
                            Approve Request
                          </button>
                          <button
                            onClick={() => handleAction(request._id, 'reject')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                          >
                            Reject Request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination could be added here if needed */}
        {requests.length > 0 && (
          <div className="mt-6 bg-white shadow-sm rounded-lg border border-green-100 px-6 py-4 flex justify-between">
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}