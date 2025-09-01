"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Play,
  FileText,
  Download,
  Eye,
  MessageSquare,
  XCircle,
  Headphones,
  Shield,
  TrendingUp,
  Volume2,
  Languages,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  show: { opacity: 1, y: 0 },
};

export default function SupportPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Core states
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("name"); // name, aadhaar, mobile
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Detail view states
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Stats states
  const [stats, setStats] = useState({
    totalReports: 0,
    completedCalls: 0,
    noAnswerCalls: 0,
    initiatedCalls: 0,
    mediumSeverity: 0,
    highSeverity: 0,
    lowSeverity: 0,
    withRecordings: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [reports]);

  // Fetch reports from API
  const fetchReports = async () => {
    try {
      setRefreshing(true);
      setError("");

      console.log("📞 Fetching support reports...");

      const response = await fetch("https://grainllyvoiceagent.onrender.com/api/reports");
      const data = await response.json();

      if (data.success && data.reports) {
        setReports(data.reports);
        setSuccess(`Loaded ${data.reports.length} support reports`);
        setTimeout(() => setSuccess(""), 3000);
        console.log("✅ Successfully loaded", data.reports.length, "reports");
      } else {
        setError("❌ Failed to fetch reports: Invalid response format");
        setReports([]);
      }
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError(`Failed to fetch reports: ${err.message}`);
      setReports([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!reports.length) return;

    const stats = {
      totalReports: reports.length,
      completedCalls: reports.filter(r => r.callStatus === "completed").length,
      noAnswerCalls: reports.filter(r => r.callStatus === "no-answer").length,
      initiatedCalls: reports.filter(r => r.callStatus === "initiated").length,
      mediumSeverity: reports.filter(r => r.fraudSeverity === "medium").length,
      highSeverity: reports.filter(r => r.fraudSeverity === "high").length,
      lowSeverity: reports.filter(r => r.fraudSeverity === "low").length,
      withRecordings: reports.filter(r => r.recordingUrl || r.playableRecordingUrl).length,
    };

    setStats(stats);
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === "" || (
      searchType === "name" && report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchType === "aadhaar" && report.aadhaar?.includes(searchTerm) ||
      searchType === "mobile" && report.mobile?.includes(searchTerm)
    );

    const matchesStatus = statusFilter === "all" || report.callStatus === statusFilter;
    const matchesSeverity = severityFilter === "all" || report.fraudSeverity === severityFilter;
    const matchesLanguage = languageFilter === "all" || report.language === languageFilter;

    const matchesDate = dateFilter === "all" || (() => {
      const reportDate = new Date(report.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case "today": return diffDays === 0;
        case "week": return diffDays <= 7;
        case "month": return diffDays <= 30;
        default: return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesSeverity && matchesLanguage && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format functions
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatAadhaar = (aadhaar) => {
    if (!aadhaar) return "N/A";
    return `****-****-${aadhaar.slice(-4)}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { variant: "default", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      "no-answer": { variant: "secondary", color: "bg-yellow-100 text-yellow-800", icon: XCircle },
      initiated: { variant: "outline", color: "bg-blue-100 text-blue-800", icon: Clock },
    };

    const config = statusConfig[status] || statusConfig.initiated;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      high: { variant: "destructive", color: "bg-red-100 text-red-800" },
      medium: { variant: "secondary", color: "bg-orange-100 text-orange-800" },
      low: { variant: "outline", color: "bg-green-100 text-green-800" },
    };

    const config = severityConfig[severity] || severityConfig.medium;

    return (
      <Badge variant={config.variant} className={config.color}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  const playRecording = (recordingUrl) => {
    if (recordingUrl) {
      window.open(recordingUrl, '_blank');
    }
  };

  const handleReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDialog(true);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600">
            Voice complaint reports and support requests from consumers
          </p>
        </div>

        {/* Stats Cards */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalReports}</div>
                <p className="text-xs text-muted-foreground">
                  All support requests
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Calls</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completedCalls}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully processed
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Recordings</CardTitle>
                <Volume2 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.withRecordings}</div>
                <p className="text-xs text-muted-foreground">
                  Audio recordings available
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Severity</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.mediumSeverity}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="flex gap-2">
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="aadhaar">Aadhaar</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={`Search by ${searchType}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="no-answer">No Answer</SelectItem>
                    <SelectItem value="initiated">Initiated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language Filter */}
              <div>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                    <SelectItem value="hi-IN">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={fetchReports}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {/* Reports List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Support Reports ({filteredReports.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading reports...</span>
              </div>
            ) : paginatedReports.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500">No support reports match the current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedReports.map((report) => (
                  <motion.div
                    key={report._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    variants={itemVariants}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Basic Info */}
                        <div>
                          <h3 className="font-semibold text-lg">{report.name}</h3>
                          <p className="text-sm text-gray-600">
                            Aadhaar: {formatAadhaar(report.aadhaar)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{report.mobile}</span>
                          </div>
                        </div>

                        {/* Status & Severity */}
                        <div>
                          {getStatusBadge(report.callStatus)}
                          <div className="mt-2">
                            {getSeverityBadge(report.fraudSeverity)}
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Languages className="h-3 w-3 mr-1" />
                              {report.language === "hi-IN" ? "Hindi" : "English"}
                            </Badge>
                          </div>
                        </div>

                        {/* Call Info */}
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <PhoneCall className="h-3 w-3 text-blue-500" />
                            <span>Call ID: {report.callSid?.slice(-8) || "N/A"}</span>
                          </div>
                          {report.completedAt && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span>Completed: {formatDate(report.completedAt)}</span>
                            </div>
                          )}
                          {(report.recordingUrl || report.playableRecordingUrl) && (
                            <div className="flex items-center gap-1 mt-1">
                              <Volume2 className="h-3 w-3 text-purple-500" />
                              <span className="text-purple-600">Recording Available</span>
                            </div>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="text-sm">
                          {report.fraudSummary && (
                            <div className="bg-orange-50 p-2 rounded text-orange-800 text-xs">
                              {report.fraudSummary.slice(0, 100)}...
                            </div>
                          )}
                          {report.transcript && (
                            <div className="bg-blue-50 p-2 rounded text-blue-800 text-xs mt-1">
                              <strong>Transcript:</strong> {report.transcript.slice(0, 50)}...
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {formatDate(report.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-col">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReportDetails(report)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        {(report.playableRecordingUrl || report.recordingUrl) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playRecording(report.playableRecordingUrl || report.recordingUrl)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                      {filteredReports.length} reports
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-1 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Details Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Support Report Details - {selectedReport?.name}
              </DialogTitle>
              <DialogDescription>
                Complete information about the support request
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedReport.name}</div>
                      <div><strong>Aadhaar:</strong> {formatAadhaar(selectedReport.aadhaar)}</div>
                      <div><strong>Mobile:</strong> {selectedReport.mobile}</div>
                      <div><strong>Language:</strong> {selectedReport.language === "hi-IN" ? "Hindi" : "English"}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Call Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Call SID:</strong> <code className="text-xs">{selectedReport.callSid}</code></div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedReport.callStatus)}</div>
                      <div><strong>Severity:</strong> {getSeverityBadge(selectedReport.fraudSeverity)}</div>
                      <div><strong>Created:</strong> {formatDate(selectedReport.createdAt)}</div>
                      {selectedReport.completedAt && (
                        <div><strong>Completed:</strong> {formatDate(selectedReport.completedAt)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                {selectedReport.transcript && (
                  <div>
                    <h4 className="font-semibold mb-3">Call Transcript</h4>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">{selectedReport.transcript}</p>
                    </div>
                  </div>
                )}

                {/* Fraud Summary */}
                {selectedReport.fraudSummary && (
                  <div>
                    <h4 className="font-semibold mb-3">Fraud Analysis Summary</h4>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-900">{selectedReport.fraudSummary}</p>
                    </div>
                  </div>
                )}

                {/* Recording */}
                {(selectedReport.recordingUrl || selectedReport.playableRecordingUrl) && (
                  <div>
                    <h4 className="font-semibold mb-3">Audio Recording</h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => playRecording(selectedReport.playableRecordingUrl || selectedReport.recordingUrl)}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Play Recording
                      </Button>
                      {selectedReport.recordingUrl && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedReport.recordingUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Original
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Details */}
                <div>
                  <h4 className="font-semibold mb-3">Technical Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Report ID:</strong> <code className="text-xs">{selectedReport._id}</code></div>
                      <div><strong>Version:</strong> {selectedReport.__v}</div>
                      {selectedReport.actionTaken !== undefined && (
                        <div><strong>Action Taken:</strong> {selectedReport.actionTaken ? "Yes" : "No"}</div>
                      )}
                      {selectedReport.adminNotes && (
                        <div><strong>Admin Notes:</strong> {selectedReport.adminNotes}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
