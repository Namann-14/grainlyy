'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown,
  Users, Package, DollarSign, Truck, MapPin,
  Calendar, Download, RefreshCw, Activity,
  AlertTriangle, CheckCircle
} from "lucide-react";

export default function AdminAnalytics() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  useEffect(() => {
    fetchAnalyticsData();
    fetchPaymentAnalytics();
  }, [selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin?endpoint=dashboard');
      const data = await response.json();
      
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentAnalytics = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=payment-analytics');
      const data = await response.json();
      
      if (data.success) {
        setPaymentAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
    }
  };

  const calculateGrowthRate = (current, previous) => {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getKPICards = () => {
    if (!analyticsData) return [];

    return [
      {
        title: "Total Users",
        value: (analyticsData.totalConsumers + analyticsData.totalShopkeepers + analyticsData.totalDeliveryAgents).toString(),
        change: "+12%",
        trend: "up",
        icon: Users,
        color: "text-blue-600",
        bgColor: "bg-blue-50"
      },
      {
        title: "Token Distribution Rate",
        value: `${Math.round((analyticsData.totalTokensClaimed / Math.max(analyticsData.totalTokensIssued, 1)) * 100)}%`,
        change: "+5.2%",
        trend: "up",
        icon: Package,
        color: "text-green-600",
        bgColor: "bg-green-50"
      },
      {
        title: "Payment Success Rate",
        value: paymentAnalytics ? `${paymentAnalytics.successRate}%` : "0%",
        change: "+2.1%",
        trend: "up",
        icon: DollarSign,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
      },
      {
        title: "System Efficiency",
        value: "87%",
        change: "-1.2%",
        trend: "down",
        icon: Activity,
        color: "text-amber-600",
        bgColor: "bg-amber-50"
      }
    ];
  };

  const exportAnalytics = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeframe: selectedTimeframe,
      summary: analyticsData,
      payments: paymentAnalytics
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading analytics data...</p>
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
              <h1 className="text-3xl font-bold text-green-900">Admin Analytics</h1>
              <p className="text-muted-foreground">
                Comprehensive system performance and insights
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={exportAnalytics}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => {
                  fetchAnalyticsData();
                  fetchPaymentAnalytics();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {getKPICards().map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <div className="flex items-center mt-1">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-full p-3 ${kpi.bgColor}`}>
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Distribution Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribution Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Tokens Issued</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {analyticsData?.totalTokensIssued || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Tokens Claimed</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {analyticsData?.totalTokensClaimed || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <span className="font-bold text-amber-600">
                    {analyticsData?.pendingTokens || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentAnalytics ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Payments</span>
                    <span className="font-bold">{paymentAnalytics.totalPayments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-green-600">₹{paymentAnalytics.totalAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <Badge className="bg-green-100 text-green-800">
                      {paymentAnalytics.successRate}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Payment</span>
                    <span className="font-bold">₹{paymentAnalytics.averagePayment}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Growth</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 font-medium">
                        {paymentAnalytics.monthlyGrowth}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No payment data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Statistics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData?.totalConsumers || 0}
                </p>
                <p className="text-sm text-gray-600">Total Consumers</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Truck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData?.totalShopkeepers || 0}
                </p>
                <p className="text-sm text-gray-600">Shopkeepers</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData?.totalDeliveryAgents || 0}
                </p>
                <p className="text-sm text-gray-600">Delivery Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/area-stats')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <MapPin className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-semibold">Area Statistics</h3>
                <p className="text-sm text-gray-600">View distribution by area</p>
              </button>
              <button
                onClick={() => router.push('/admin/category-stats')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
                <h3 className="font-semibold">Category Analysis</h3>
                <p className="text-sm text-gray-600">BPL vs APL statistics</p>
              </button>
              <button
                onClick={() => router.push('/admin/payments')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
                <h3 className="font-semibold">Payment Reports</h3>
                <p className="text-sm text-gray-600">Detailed payment analysis</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}