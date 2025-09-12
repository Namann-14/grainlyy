"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import TransactionMonitor from "@/components/TransactionMonitor";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Users,
  Wallet,
  Building,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  Zap,
  Activity,
  Database,
  RefreshCw,
  DollarSign,
  CreditCard,
  Settings,
  Pause,
  Play,
  Shield,
  FileText,
  BarChart3,
  PieChart,
  Download,
  Bell,
  X,
  Check,
  Eye,
  UserX,
  UserPlus,
  Navigation,
  Star,
  Award,
  Target,
  Gauge,
  Link2,
  Copy,
  ExternalLink,
  XCircle,
  Search,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  // Backend Connection States - No MetaMask needed
  const [isConnected, setIsConnected] = useState(false);
  const [adminWalletAddress] = useState(
    "0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa"
  ); // From env

  // Core Dashboard States
  const [dashboardData, setDashboardData] = useState({
    totalConsumers: 0,
    totalShopkeepers: 0,
    totalDeliveryAgents: 0,
    activeDeliveries: 0,
    tokensDistributed: 0,
    systemStatus: "Active",
    rationPrice: 0,
    subsidyPercentage: 0,
    currentMonth: 0,
    currentYear: 0,
  });

  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [areaStats, setAreaStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState(null);
  const [anomalyData, setAnomalyData] = useState({
    total_records: 0,
    ml_anomalies: 0,
    rule_based_anomalies: 0,
    anomaly_details: []
  });

  // User Management States
  const [allConsumers, setAllConsumers] = useState([]);
  const [consumersByCategory, setConsumersByCategory] = useState({
    BPL: [],
    APL: [],
    AAY: [],
    PHH: [],
  });
  const [allShopkeepers, setAllShopkeepers] = useState([]);
  const [allDeliveryAgents, setAllDeliveryAgents] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Token Management States
  const [expiredTokens, setExpiredTokens] = useState([]);
  const [expiringSoonTokens, setExpiringSoonTokens] = useState([]);
  const [selectedTokenToExpire, setSelectedTokenToExpire] = useState(null);
  
  // Individual token expiration states
  const [expireTokenId, setExpireTokenId] = useState("");

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Loading States for Actions
  const [actionLoading, setActionLoading] = useState({
    generateMonthlyTokens: false,
    generateCategoryTokens: false,
    expireOldTokens: false,
    pauseSystem: false,
    unpauseSystem: false,
    settingPrice: false,
    settingSubsidy: false,
    bulkGenerateTokens: false,
    assigningAgent: false,
    updatingSystem: false,
    expireToken: false,
    getExpired: false,
    getExpiringSoon: false,
  });

  // Form States
  const [priceSettings, setPriceSettings] = useState({
    category: "BPL", // Default category
    rationPrice: "",
    subsidyPercentage: "",
  });

  const [assignAgentForm, setAssignAgentForm] = useState({
    deliveryAgent: "",
    shopkeeper: "",
    rationDetails: "",
    orderId: "",
    showDialog: false,
  });

  const [bulkTokenForm, setBulkTokenForm] = useState({
    aadhaars: "",
    showDialog: false,
  });

  // New form states for additional features
  const [emergencyForm, setEmergencyForm] = useState({
    orderId: "",
    reason: "",
    showDialog: false,
  });

  const [notificationForm, setNotificationForm] = useState({
    role: "",
    message: "",
    priority: "normal",
    showDialog: false,
  });

  // Token Expiration Form States
  const [tokenExpirationForm, setTokenExpirationForm] = useState({
    tokenId: "",
    showExpireDialog: false,
    showExpiredTokensDialog: false,
    showExpiringSoonDialog: false,
  });

  // ========== BACKEND API INITIALIZATION ==========

  useEffect(() => {
    initializeBackendConnection();
  }, []);

  const initializeBackendConnection = async () => {
    try {
      setLoading(true);

      // Test backend connection
      const response = await fetch("/api/admin?endpoint=test-connection");
      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        toast({
          title: "Success",
          description: "Backend wallet connected successfully!",
          variant: "default",
        });
        console.log("Backend connection established:", data.data);

        // Fetch all dashboard data
        await fetchAllDashboardData();
      } else {
        setError("❌ Failed to connect to backend wallet: " + data.error);
      }
    } catch (error) {
      console.error("Backend connection error:", error);
      setError("❌ Backend connection failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== DATA FETCHING FUNCTIONS ==========

  const fetchAllDashboardData = async () => {
    try {
      setRefreshing(true);
      setError("");

      // Fetch all data in parallel
      const promises = [
        fetchDashboardStats(),
        fetchPaymentAnalytics(),
        fetchSystemSettings(),
        fetchUsers(),
        fetchActiveDeliveries(),
        fetchAreaStats(),
        fetchCategoryStats(),
        fetchEmergencyCases(),
        fetchNotifications(),
        fetchAnomalyData(),
      ];

      await Promise.allSettled(promises);
      toast({
        title: "Success",
        description: "Dashboard data refreshed successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("❌ Failed to fetch dashboard data: " + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=dashboard");
      const data = await response.json();

      if (data.success) {
        setDashboardData((prev) => ({
          ...prev,
          totalConsumers: data.data.totalConsumers || 0,
          totalShopkeepers: data.data.totalShopkeepers || 0,
          totalDeliveryAgents: data.data.totalDeliveryAgents || 0,
          totalTokensIssued: data.data.totalTokensIssued || 0,
          totalTokensClaimed: data.data.totalTokensClaimed || 0,
          pendingTokens: data.data.pendingTokens || 0,
          currentMonth: data.data.currentMonth || new Date().getMonth() + 1,
          currentYear: data.data.currentYear || new Date().getFullYear(),
        }));

        if (data.warning) {
          console.warn("Dashboard warning:", data.warning);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const fetchPaymentAnalytics = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=payment-analytics");
      const data = await response.json();

      if (data.success) {
        setPaymentAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching payment analytics:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=system-settings");
      const data = await response.json();

      if (data.success) {
        setDashboardData((prev) => ({
          ...prev,
          rationPrice: data.data.rationPrice || 0,
          subsidyPercentage: data.data.subsidyPercentage || 0,
          systemStatus: data.data.isPaused ? "Paused" : "Active",
        }));

        setPriceSettings({
          rationPrice: data.data.rationPrice?.toString() || "",
          subsidyPercentage: data.data.subsidyPercentage?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch consumers
      const consumersResponse = await fetch(
        "/api/admin?endpoint=get-consumers&limit=100"
      );
      if (consumersResponse.ok) {
        const consumersData = await consumersResponse.json();
        if (consumersData.success) {
          setAllConsumers(consumersData.data);

          // Group by category
          const grouped = {
            BPL: consumersData.data.filter(
              (c) => c.category === "BPL" || c.category === 0
            ),
            APL: consumersData.data.filter(
              (c) => c.category === "APL" || c.category === 1
            ),
            AAY: consumersData.data.filter((c) => c.category === "AAY"),
            PHH: consumersData.data.filter((c) => c.category === "PHH"),
          };
          setConsumersByCategory(grouped);
        }
      }

      // Fetch shopkeepers
      const shopkeepersResponse = await fetch(
        "/api/admin?endpoint=get-shopkeepers"
      );
      if (shopkeepersResponse.ok) {
        const shopkeepersData = await shopkeepersResponse.json();
        if (shopkeepersData.success) {
          setAllShopkeepers(shopkeepersData.data);
        }
      }

      // Fetch delivery agents
      const agentsResponse = await fetch(
        "/api/admin?endpoint=get-delivery-agents"
      );
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        if (agentsData.success) {
          setAllDeliveryAgents(agentsData.data);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchActiveDeliveries = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=get-active-deliveries");
      const data = await response.json();

      if (data.success) {
        setActiveDeliveries(data.data);
      }
    } catch (error) {
      console.error("Error fetching active deliveries:", error);
    }
  };

  const fetchAreaStats = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=area-stats");
      const data = await response.json();

      if (data.success) {
        setAreaStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching area stats:", error);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=category-stats");
      const data = await response.json();

      if (data.success) {
        setCategoryStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching category stats:", error);
    }
  };

  const fetchEmergencyCases = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=emergency-cases");
      const data = await response.json();

      if (data.success) {
        setEmergencyCases(data.data);
      }
    } catch (error) {
      console.error("Error fetching emergency cases:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/admin?endpoint=get-notifications");
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchAnomalyData = async () => {
    try {
      const response = await fetch("http://localhost:8000/anomalies");
      const data = await response.json();

      if (data) {
        setAnomalyData(data);
      }
    } catch (error) {
      console.error("Error fetching anomaly data:", error);
      // Set default values if API fails
      setAnomalyData({
        total_records: 0,
        ml_anomalies: 0,
        rule_based_anomalies: 0,
        anomaly_details: []
      });
    }
  };

  // ========== TOKEN MANAGEMENT FUNCTIONS ==========

  const generateMonthlyTokensForAll = async () => {
    // Prevent multiple simultaneous executions
    if (actionLoading.generateMonthlyTokens) {
      console.log('⚠️ Token generation already in progress, ignoring duplicate call');
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, generateMonthlyTokens: true }));
      setError("");

      const response = await fetch(
        "/api/admin?endpoint=generate-monthly-tokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Monthly tokens generation started! ${data.message}`,
          variant: "default",
        });

        // Use a unique transaction ID to prevent React key conflicts
        const uniqueId = `monthly-tokens-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        addTransactionToMonitor({
          hash: data.txHash || uniqueId,
          type: "Monthly Token Generation",
          details: data.message || "Generated monthly tokens for all consumers",
          status: "completed",
          polygonScanUrl: data.polygonScanUrl,
          timestamp: Date.now()
        });

        // Refresh data after some time
        setTimeout(() => fetchAllDashboardData(), 30000);
      } else {
        setError("❌ Failed to generate monthly tokens: " + data.error);
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Token generation error:', error);
      setError("❌ Error generating monthly tokens: " + error.message);
      toast({
        title: "Error",
        description: "Failed to generate monthly tokens: " + error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, generateMonthlyTokens: false }));
    }
  };

  const generateCategoryTokens = async (category) => {
    // Prevent multiple simultaneous executions
    if (actionLoading.generateCategoryTokens) {
      console.log('⚠️ Category token generation already in progress, ignoring duplicate call');
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, generateCategoryTokens: true }));
      setError("");

      const response = await fetch(
        "/api/admin?endpoint=generate-category-tokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Tokens generation completed for ${category} category! ${data.message}`,
          variant: "default",
        });

        // Use a unique transaction ID to prevent React key conflicts
        const uniqueId = `category-tokens-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        addTransactionToMonitor({
          hash: data.txHash || uniqueId,
          type: "Category Token Generation",
          details: data.message || `Generated tokens for ${category} category`,
          status: "completed",
          polygonScanUrl: data.polygonScanUrl,
          timestamp: Date.now()
        });
      } else {
        setError("❌ Failed to generate category tokens: " + data.error);
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Category token generation error:', error);
      setError("❌ Error generating category tokens: " + error.message);
      toast({
        title: "Error",
        description: "Failed to generate category tokens: " + error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, generateCategoryTokens: false }));
    }
  };

  const bulkGenerateTokens = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, bulkGenerateTokens: true }));
      setError("");

      // Parse comma-separated Aadhaar numbers
      const aadhaars = bulkTokenForm.aadhaars
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);

      if (aadhaars.length === 0) {
        setError("❌ Please enter at least one Aadhaar number");
        return;
      }

      const response = await fetch("/api/admin?endpoint=bulk-generate-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaars }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Bulk token generation started for ${aadhaars.length} consumers! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        setBulkTokenForm({ aadhaars: "", showDialog: false });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Bulk Token Generation",
          details: `Generated tokens for ${aadhaars.length} consumers`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });
      } else {
        setError("❌ Failed to bulk generate tokens: " + data.error);
      }
    } catch (error) {
      setError("❌ Error bulk generating tokens: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, bulkGenerateTokens: false }));
    }
  };

  const expireOldTokens = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, expireOldTokens: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=expire-old-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Old tokens expiration started! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Expire Old Tokens",
          details: "Expired old/unused tokens",
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });
      } else {
        setError("❌ Failed to expire old tokens: " + data.error);
      }
    } catch (error) {
      setError("❌ Error expiring old tokens: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, expireOldTokens: false }));
    }
  };

  // ========== TOKEN EXPIRATION FUNCTIONS ==========

  const expireTokenById = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, expireToken: true }));
      setError("");

      if (!expireTokenId) {
        setError("❌ Please enter a token ID to expire");
        return;
      }

      const response = await fetch("/api/admin?endpoint=expire-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: expireTokenId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("✅ Token expired successfully!");
        setExpireTokenId("");
      } else {
        setError("❌ Failed to expire token: " + data.error);
      }
    } catch (error) {
      setError("❌ Error expiring token: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, expireToken: false }));
    }
  };

  const getExpiredTokens = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, getExpired: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=get-expired-tokens", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setExpiredTokens(data.expiredTokens || []);
        setSuccess(`✅ Found ${data.expiredTokens?.length || 0} expired tokens`);
      } else {
        setError("❌ Failed to get expired tokens: " + data.error);
      }
    } catch (error) {
      setError("❌ Error getting expired tokens: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, getExpired: false }));
    }
  };

  const getExpiringSoonTokens = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, getExpiringSoon: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=get-expiring-soon-tokens", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setExpiringSoonTokens(data.expiringSoonTokens || []);
        setSuccess(`✅ Found ${data.expiringSoonTokens?.length || 0} tokens expiring soon`);
      } else {
        setError("❌ Failed to get expiring soon tokens: " + data.error);
      }
    } catch (error) {
      setError("❌ Error getting expiring soon tokens: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, getExpiringSoon: false }));
    }
  };

  // ========== SYSTEM MANAGEMENT FUNCTIONS ==========

  const pauseSystem = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, pauseSystem: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=pause-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `System paused successfully! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Pause System",
          details: "System paused for maintenance",
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });

        // Update system status
        setDashboardData((prev) => ({ ...prev, systemStatus: "Paused" }));
      } else {
        setError("❌ Failed to pause system: " + data.error);
      }
    } catch (error) {
      setError("❌ Error pausing system: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, pauseSystem: false }));
    }
  };

  const unpauseSystem = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, unpauseSystem: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=unpause-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `System resumed successfully! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Unpause System",
          details: "System resumed operations",
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });

        // Update system status
        setDashboardData((prev) => ({ ...prev, systemStatus: "Active" }));
      } else {
        setError("❌ Failed to resume system: " + data.error);
      }
    } catch (error) {
      setError("❌ Error resuming system: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, unpauseSystem: false }));
    }
  };

  const setRationPrice = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, settingPrice: true }));
      setError("");

      if (!priceSettings.rationPrice || isNaN(priceSettings.rationPrice)) {
        setError("❌ Please enter a valid ration price");
        return;
      }

      if (!priceSettings.category) {
        setError("❌ Please select a category");
        return;
      }

      const response = await fetch("/api/admin?endpoint=set-ration-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category: priceSettings.category,
          price: priceSettings.rationPrice 
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Ration price for ${priceSettings.category} updated to ₹${priceSettings.rationPrice}! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Set Ration Price",
          details: `Updated ${priceSettings.category} ration price to ₹${priceSettings.rationPrice}`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });
      } else {
        setError("❌ Failed to set ration price: " + data.error);
      }
    } catch (error) {
      setError("❌ Error setting ration price: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, settingPrice: false }));
    }
  };

  const setSubsidyPercentage = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, settingSubsidy: true }));
      setError("");

      if (
        !priceSettings.subsidyPercentage ||
        isNaN(priceSettings.subsidyPercentage)
      ) {
        setError("❌ Please enter a valid subsidy percentage");
        return;
      }

      const response = await fetch(
        "/api/admin?endpoint=set-subsidy-percentage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ percentage: priceSettings.subsidyPercentage }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Subsidy percentage updated to ${priceSettings.subsidyPercentage}%! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Set Subsidy Percentage",
          details: `Updated subsidy to ${priceSettings.subsidyPercentage}%`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });
      } else {
        setError("❌ Failed to set subsidy percentage: " + data.error);
      }
    } catch (error) {
      setError("❌ Error setting subsidy percentage: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, settingSubsidy: false }));
    }
  };

  // ========== DELIVERY MANAGEMENT FUNCTIONS ==========

  const assignDeliveryAgentToShopkeeper = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, assigningAgent: true }));
      setError("");
      // Validate all fields
      if (!assignAgentForm.deliveryAgent || !assignAgentForm.shopkeeper) {
        setError("❌ Please select both delivery agent and shopkeeper");
        return;
      }

      const response = await fetch(
        "/api/admin?endpoint=assign-delivery-agent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryAgentAddress: assignAgentForm.deliveryAgent,
            shopkeeperAddress: assignAgentForm.shopkeeper,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Delivery agent assigned successfully! View on PolygonScan: ${data.polygonScanUrl}`,
          variant: "default",
        });

        setAssignAgentForm({
          deliveryAgent: "",
          shopkeeper: "",
          showDialog: false,
        });

        addTransactionToMonitor({
          hash: data.txHash,
          type: "Assign Delivery Agent",
          details: `Assigned delivery agent to shopkeeper`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });

        // Refresh data
        setTimeout(() => fetchUsers(), 10000);
      } else {
        // Show more details if available
        setError(
          "❌ Failed to assign delivery agent: " +
            (data.error ||
              "Unknown error. Please check backend logs and contract conditions.")
        );
      }
    } catch (error) {
      setError(
        "❌ Error assigning delivery agent: " + (error?.message || error)
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, assigningAgent: false }));
    }
  };

  // ========== UTILITY FUNCTIONS ==========

  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent("addTransaction", { detail: txData });
    window.dispatchEvent(event);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Success",
        description: "Copied to clipboard!",
        variant: "default",
      });
    } catch (error) {
      setError("❌ Failed to copy to clipboard");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // ========== ADDITIONAL ADMIN FUNCTIONS ==========

  const generateTokenForConsumer = async (aadhaar) => {
    try {
      setActionLoading((prev) => ({ ...prev, updatingSystem: true }));
      setError("");

      const response = await fetch(
        "/api/admin?endpoint=generate-token-consumer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aadhaar }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Token generated successfully for consumer ${aadhaar}!`,
          variant: "default",
        });
        addTransactionToMonitor({
          hash: data.txHash,
          type: "Generate Token",
          details: `Generated token for consumer ${aadhaar}`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });
      } else {
        setError("❌ Failed to generate token: " + data.error);
      }
    } catch (error) {
      setError("❌ Error generating token: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, updatingSystem: false }));
    }
  };

  const deactivateUser = async (userType, identifier) => {
    try {
      setActionLoading((prev) => ({ ...prev, updatingSystem: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=deactivate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, identifier }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `${userType} deactivated successfully!`,
          variant: "default",
        });
        addTransactionToMonitor({
          hash: data.txHash,
          type: "Deactivate User",
          details: `Deactivated ${userType}`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });

        // Refresh users
        fetchUsers();
      } else {
        setError("❌ Failed to deactivate user: " + data.error);
      }
    } catch (error) {
      setError("❌ Error deactivating user: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, updatingSystem: false }));
    }
  };

  const reactivateUser = async (userType, identifier) => {
    try {
      setActionLoading((prev) => ({ ...prev, updatingSystem: true }));
      setError("");

      const response = await fetch("/api/admin?endpoint=reactivate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, identifier }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `${userType} reactivated successfully!`,
          variant: "default",
        });
        addTransactionToMonitor({
          hash: data.txHash,
          type: "Reactivate User",
          details: `Reactivated ${userType}`,
          status: "pending",
          polygonScanUrl: data.polygonScanUrl,
        });

        // Refresh users
        fetchUsers();
      } else {
        setError("❌ Failed to reactivate user: " + data.error);
      }
    } catch (error) {
      setError("❌ Error reactivating user: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, updatingSystem: false }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Connecting to backend wallet...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 max-w-7xl mx-auto mt-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                PDS Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Indian Public Distribution System - Blockchain Powered
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {isConnected ? "Backend Connected" : "Backend Disconnected"}
                  </span>
                </div>
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 mr-1 text-gray-500" />
                  <span className="text-sm text-gray-600 font-mono">
                    {formatAddress(adminWalletAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(adminWalletAddress)}
                    className="ml-1 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => fetchAllDashboardData()}
                disabled={refreshing}
                variant="outline"
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <a
                href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Contract
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div
                className="text-red-700"
                dangerouslySetInnerHTML={{ __html: error }}
              />
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 max-w-7xl mx-auto">
            <div className="flex">
              <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
              <div
                className="text-green-700"
                dangerouslySetInnerHTML={{ __html: success }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full max-w-7xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-4 mb-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Token Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            {/* <TabsTrigger value="deliveries">Delivery Management</TabsTrigger>
            <TabsTrigger value="payments">Payment Analytics</TabsTrigger> */}
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Consumers
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData.totalConsumers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registered beneficiaries
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Shopkeepers
                    </CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData.totalShopkeepers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active distribution points
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Delivery Agents
                    </CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData.totalDeliveryAgents.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active delivery personnel
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      System Status
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Badge
                        variant={
                          dashboardData.systemStatus === "Active"
                            ? "default"
                            : "destructive"
                        }
                        className="text-sm"
                      >
                        {dashboardData.systemStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current operational status
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      generateMonthlyTokensForAll();
                    }}
                    disabled={actionLoading.generateMonthlyTokens}
                    className="h-20 w-40 flex flex-col items-center justify-center"
                  >
                    {actionLoading.generateMonthlyTokens ? (
                      <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                    ) : (
                      <Package className="h-5 w-5 mb-2" />
                    )}
                    <span className="text-xs text-center">Generate Monthly Tokens</span>
                  </Button>

                  <Link href="/admin/consumer-requests">
                    <Button
                      // onClick={() => router.push('/admin/consumer-requests')}
                      variant="outline"
                      className="h-20 w-40 flex flex-col items-center justify-center"
                    >
                      <UserPlus className="h-5 w-5 mb-2" />
                      <span className="text-xs text-center">Consumer Requests</span>
                    </Button>
                  </Link>

                  <Button
                    onClick={expireOldTokens}
                    disabled={actionLoading.expireOldTokens}
                    variant="outline"
                    className="h-20 w-40 flex flex-col items-center justify-center"
                  >
                    {actionLoading.expireOldTokens ? (
                      <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                    ) : (
                      <Clock className="h-5 w-5 mb-2" />
                    )}
                    <span className="text-xs text-center">Expire Old Tokens</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consumer Categories</CardTitle>
                  <CardDescription>
                    Distribution by ration card type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(consumersByCategory).map(
                      ([category, consumers]) => (
                        <div
                          key={category}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-3 bg-blue-500" />
                            <span className="font-medium">{category}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              {consumers.length}
                            </span>
                            <Button
                              onClick={() => generateCategoryTokens(category)}
                              disabled={actionLoading.generateCategoryTokens}
                              size="sm"
                              variant="outline"
                            >
                              {actionLoading.generateCategoryTokens ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                "Generate Tokens"
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Anomalies</CardTitle>
                  <CardDescription>Detected irregularities in distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-3xl font-bold text-red-600">
                        {anomalyData.ml_anomalies + anomalyData.rule_based_anomalies}
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {anomalyData.total_records} Total Records
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>ML Anomalies:</span>
                        <span className="font-medium text-orange-600">
                          {anomalyData.ml_anomalies}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rule-based:</span>
                        <span className="font-medium text-red-600">
                          {anomalyData.rule_based_anomalies}
                        </span>
                      </div>
                    </div>

                    {anomalyData.anomaly_details.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Recent anomalies detected
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {anomalyData.anomaly_details.slice(0, 3).map((anomaly, index) => (
                            <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-300">
                              <div className="font-medium">Token ID: {anomaly.tokenId}</div>
                              <div className="text-gray-600">Aadhaar: {anomaly.aadhaar}</div>
                              <div className="text-gray-600">
                                Issued: {anomaly.issuedAt} | 
                                Claimed: {anomaly.claimAt || 'Not claimed'}
                              </div>
                              {anomaly.reasons && anomaly.reasons.length > 0 && (
                                <div className="text-red-700 mt-1">
                                  {anomaly.reasons[0]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => fetchAnomalyData()}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Refresh Anomalies
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Token Management Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Token Generation */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Token Generation</CardTitle>
                  <CardDescription>
                    Generate tokens for all eligible consumers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 h-full flex justify-end flex-col">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      generateMonthlyTokensForAll();
                    }}
                    disabled={actionLoading.generateMonthlyTokens}
                    className="w-full"
                  >
                    {actionLoading.generateMonthlyTokens ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Package className="h-4 w-4 mr-2" />
                    )}
                    Generate Monthly Tokens
                  </Button>
                  <p className="text-xs text-gray-600">
                    This will generate tokens for all consumers who haven't
                    received tokens this month
                  </p>
                </CardContent>
              </Card>

              {/* Category-wise Generation */}
              <Card>
                <CardHeader>
                  <CardTitle>Category-wise Generation</CardTitle>
                  <CardDescription>
                    Generate tokens by ration card category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["BPL", "APL", "AAY", "PHH"].map((category) => (
                    <Button
                      key={category}
                      onClick={() => generateCategoryTokens(category)}
                      disabled={actionLoading.generateCategoryTokens}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {actionLoading.generateCategoryTokens ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      {category} Category (
                      {consumersByCategory[category]?.length || 0})
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Bulk Operations */}
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Operations</CardTitle>
                  <CardDescription>Advanced token management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() =>
                      setBulkTokenForm({ ...bulkTokenForm, showDialog: true })
                    }
                    variant="outline"
                    className="w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Bulk Generate Tokens
                  </Button>

                  <Button
                    onClick={expireOldTokens}
                    disabled={actionLoading.expireOldTokens}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading.expireOldTokens ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Expire Old Tokens
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Token Expiration Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Manual Token Expiration */}
              <Card>
                <CardHeader>
                  <CardTitle>Manual Token Expiration</CardTitle>
                  <CardDescription>
                    Expire specific tokens by ID
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token ID</label>
                    <Input
                      type="number"
                      placeholder="Enter token ID"
                      value={expireTokenId}
                      onChange={(e) => setExpireTokenId(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={expireTokenById}
                    disabled={actionLoading.expireToken || !expireTokenId}
                    className="w-full"
                    variant="destructive"
                  >
                    {actionLoading.expireToken ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Expire Token
                  </Button>
                </CardContent>
              </Card>

              {/* Expired Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle>Expired Tokens</CardTitle>
                  <CardDescription>
                    View all expired tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={getExpiredTokens}
                    disabled={actionLoading.getExpired}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading.getExpired ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Get Expired Tokens
                  </Button>
                  {expiredTokens && expiredTokens.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        Found {expiredTokens.length} expired tokens
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {expiredTokens.slice(0, 5).map((token, index) => (
                          <div key={index} className="text-xs text-red-700 mb-1 p-1 bg-red-100 rounded">
                            <div>Token ID: {token.tokenId}</div>
                            <div>Aadhaar: {token.aadhaar}</div>
                            <div>Category: {token.category}</div>
                            <div>Expired: {token.expiryDate}</div>
                          </div>
                        ))}
                        {expiredTokens.length > 5 && (
                          <div className="text-xs text-red-600 mt-1">
                            ... and {expiredTokens.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expiring Soon Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle>Expiring Soon</CardTitle>
                  <CardDescription>
                    Tokens expiring within 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={getExpiringSoonTokens}
                    disabled={actionLoading.getExpiringSoon}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading.getExpiringSoon ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Get Expiring Soon
                  </Button>
                  {expiringSoonTokens && expiringSoonTokens.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">
                        Found {expiringSoonTokens.length} tokens expiring soon
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {expiringSoonTokens.slice(0, 5).map((token, index) => (
                          <div key={index} className="text-xs text-yellow-700 mb-1 p-1 bg-yellow-100 rounded">
                            <div>Token ID: {token.tokenId}</div>
                            <div>Aadhaar: {token.aadhaar}</div>
                            <div>Category: {token.category}</div>
                            <div>Expires: {token.expiryDate}</div>
                            <div>Days left: {token.daysUntilExpiry}</div>
                          </div>
                        ))}
                        {expiringSoonTokens.length > 5 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            ... and {expiringSoonTokens.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Consumers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Consumers</span>
                    <Badge>{allConsumers.length}</Badge>
                  </CardTitle>
                  <CardDescription>Registered beneficiaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(consumersByCategory).map(
                      ([category, consumers]) => (
                        <div
                          key={category}
                          className="flex justify-between text-sm"
                        >
                          <span>{category}:</span>
                          <span className="font-medium">
                            {consumers.length}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <Button
                    onClick={() => router.push("/admin/consumers")}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Consumers
                  </Button>
                </CardContent>
              </Card>

              {/* Shopkeepers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Shopkeepers</span>
                    <Badge>{allShopkeepers.length}</Badge>
                  </CardTitle>
                  <CardDescription>Distribution points</CardDescription>
                </CardHeader>
                <CardContent className='flex flex-col justify-between h-full'>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-green-600">
                        {allShopkeepers.filter((s) => s.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inactive:</span>
                      <span className="font-medium text-red-600">
                        {allShopkeepers.filter((s) => !s.isActive).length}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push("/admin/shopkeepers")}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Manage Shopkeepers
                  </Button>
                </CardContent>
              </Card>

              {/* Delivery Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Delivery Agents</span>
                    <Badge>{allDeliveryAgents.length}</Badge>
                  </CardTitle>
                  <CardDescription>Delivery personnel</CardDescription>
                </CardHeader>
                <CardContent className="h-full flex flex-col justify-between">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-green-600">
                        {allDeliveryAgents.filter((a) => a.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inactive:</span>
                      <span className="font-medium text-red-600">
                        {allDeliveryAgents.filter((a) => !a.isActive).length}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push("/admin/delivery-agents")}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Manage Agents
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Delivery Management Tab */}
          {/* <TabsContent value="deliveries" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Delivery Agent</CardTitle>
                  <CardDescription>
                    Assign delivery agents to shopkeepers
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex h-full items-end">
                  <Button
                    onClick={() =>
                      setAssignAgentForm({
                        ...assignAgentForm,
                        showDialog: true,
                      })
                    }
                    className="w-full"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Assign Agent to Shopkeeper
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Deliveries</CardTitle>
                  <CardDescription>Monitor ongoing deliveries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-4">
                    {activeDeliveries.length}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Deliveries in progress
                  </p>
                  <Button
                    onClick={() => router.push("/admin/deliveries")}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View All Deliveries
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent> */}

          {/* Payment Analytics Tab */}
          {/* <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paymentAnalytics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {paymentAnalytics.totalPayments || 0}
                      </div>
                      <p className="text-sm text-gray-600">
                        Completed transactions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatCurrency(paymentAnalytics.totalAmount || 0)}
                      </div>
                      <p className="text-sm text-gray-600">Total processed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {paymentAnalytics.pendingPayments || 0}
                      </div>
                      <p className="text-sm text-gray-600">
                        Awaiting processing
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>
                  Access detailed payment analytics and management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push("/admin/payments")}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payment Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Settings</CardTitle>
                  <CardDescription>
                    Configure ration pricing and subsidies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Ration Card Category
                    </label>
                    <Select
                      value={priceSettings.category}
                      onValueChange={(value) =>
                        setPriceSettings((prev) => ({
                          ...prev,
                          category: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BPL">BPL (Below Poverty Line)</SelectItem>
                        <SelectItem value="APL">APL (Above Poverty Line)</SelectItem>
                        <SelectItem value="AAY">AAY (Antyodaya Anna Yojana)</SelectItem>
                        <SelectItem value="PHH">PHH (Priority Households)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Ration Price (₹ per kg) for {priceSettings.category}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={priceSettings.rationPrice}
                      onChange={(e) =>
                        setPriceSettings((prev) => ({
                          ...prev,
                          rationPrice: e.target.value,
                        }))
                      }
                      placeholder="Enter price per kg"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Subsidy Percentage (%)
                    </label>
                    <Input
                      type="number"
                      value={priceSettings.subsidyPercentage}
                      onChange={(e) =>
                        setPriceSettings((prev) => ({
                          ...prev,
                          subsidyPercentage: e.target.value,
                        }))
                      }
                      placeholder="Enter percentage"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={setRationPrice}
                      disabled={actionLoading.settingPrice}
                      className="flex-1"
                    >
                      {actionLoading.settingPrice ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="h-4 w-4 mr-2" />
                      )}
                      Set {priceSettings.category} Price
                    </Button>

                    <Button
                      onClick={setSubsidyPercentage}
                      disabled={actionLoading.settingSubsidy}
                      className="flex-1"
                    >
                      {actionLoading.settingSubsidy ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Gauge className="h-4 w-4 mr-2" />
                      )}
                      Set Subsidy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Control */}
              <Card>
                <CardHeader>
                  <CardTitle>System Control</CardTitle>
                  <CardDescription>Emergency system controls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">System Status</h4>
                      <p className="text-sm text-gray-600">
                        Current operational status
                      </p>
                    </div>
                    <Badge
                      variant={
                        dashboardData.systemStatus === "Active"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {dashboardData.systemStatus}
                    </Badge>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={pauseSystem}
                      disabled={
                        actionLoading.pauseSystem ||
                        dashboardData.systemStatus === "Paused"
                      }
                      variant="destructive"
                      className="flex-1"
                    >
                      {actionLoading.pauseSystem ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Pause System
                    </Button>

                    <Button
                      onClick={unpauseSystem}
                      disabled={
                        actionLoading.unpauseSystem ||
                        dashboardData.systemStatus === "Active"
                      }
                      className="flex-1"
                    >
                      {actionLoading.unpauseSystem ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Resume System
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Blockchain and contract details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Contract Address:</span>
                    <div className="flex items-center mt-1">
                      <span className="font-mono text-xs">
                        {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
                          )
                        }
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Admin Wallet:</span>
                    <div className="flex items-center mt-1">
                      <span className="font-mono text-xs">
                        {adminWalletAddress}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(adminWalletAddress)}
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Network:</span>
                    <p className="text-xs mt-1">Polygon Amoy Testnet</p>
                  </div>

                  <div>
                    <span className="font-medium">Connection Status:</span>
                    <div className="flex items-center mt-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          isConnected ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span className="text-xs">
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}

        {/* Assign Delivery Agent Dialog */}
        <Dialog
          open={assignAgentForm.showDialog}
          onOpenChange={(open) =>
            setAssignAgentForm({ ...assignAgentForm, showDialog: open })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Delivery Agent to Shopkeeper</DialogTitle>
              <DialogDescription>
                Select a delivery agent and shopkeeper to create an assignment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Order ID</label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 mt-1"
                  value={assignAgentForm.orderId}
                  onChange={(e) =>
                    setAssignAgentForm((prev) => ({
                      ...prev,
                      orderId: e.target.value,
                    }))
                  }
                  placeholder="Enter order ID"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Delivery Agent</label>
                <Select
                  value={assignAgentForm.deliveryAgent}
                  onValueChange={(value) =>
                    setAssignAgentForm((prev) => ({
                      ...prev,
                      deliveryAgent: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDeliveryAgents.map((agent, index) => (
                      <SelectItem
                        key={
                          agent.agentAddress ||
                          agent.address ||
                          `agent-${index}`
                        }
                        value={agent.agentAddress || agent.address}
                      >
                        {agent.name} (
                        {formatAddress(agent.agentAddress || agent.address)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Shopkeeper</label>
                <Select
                  value={assignAgentForm.shopkeeper}
                  onValueChange={(value) =>
                    setAssignAgentForm((prev) => ({
                      ...prev,
                      shopkeeper: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shopkeeper" />
                  </SelectTrigger>
                  <SelectContent>
                    {allShopkeepers.map((shopkeeper, index) => (
                      <SelectItem
                        key={
                          shopkeeper.address ||
                          shopkeeper.shopkeeperAddress ||
                          `shopkeeper-${index}`
                        }
                        value={
                          shopkeeper.address || shopkeeper.shopkeeperAddress
                        }
                      >
                        {shopkeeper.name} (
                        {formatAddress(
                          shopkeeper.address || shopkeeper.shopkeeperAddress
                        )}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Ration Details</label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 mt-1"
                  value={assignAgentForm.rationDetails}
                  onChange={(e) =>
                    setAssignAgentForm((prev) => ({
                      ...prev,
                      rationDetails: e.target.value,
                    }))
                  }
                  placeholder="Enter ration details (optional)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setAssignAgentForm({
                    deliveryAgent: "",
                    shopkeeper: "",
                    showDialog: false,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={assignDeliveryAgentToShopkeeper}
                disabled={actionLoading.assigningAgent}
              >
                {actionLoading.assigningAgent ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Assign Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Token Generation Dialog */}
        <Dialog
          open={bulkTokenForm.showDialog}
          onOpenChange={(open) =>
            setBulkTokenForm({ ...bulkTokenForm, showDialog: open })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Generate Tokens</DialogTitle>
              <DialogDescription>
                Enter Aadhaar numbers separated by commas to generate tokens in
                bulk
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Aadhaar Numbers</label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  value={bulkTokenForm.aadhaars}
                  onChange={(e) =>
                    setBulkTokenForm((prev) => ({
                      ...prev,
                      aadhaars: e.target.value,
                    }))
                  }
                  placeholder="Enter Aadhaar numbers separated by commas (e.g., 123456789012, 234567890123, 345678901234)"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {
                    bulkTokenForm.aadhaars.split(",").filter((a) => a.trim())
                      .length
                  }{" "}
                  Aadhaar numbers
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setBulkTokenForm({ aadhaars: "", showDialog: false })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={bulkGenerateTokens}
                disabled={actionLoading.bulkGenerateTokens}
              >
                {actionLoading.bulkGenerateTokens ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                Generate Tokens
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Monitor */}
        <TransactionMonitor />
      </div>
    </AdminLayout>
  );
}