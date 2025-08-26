'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import DCVTokenABI from "../../../abis/DCVToken.json";
import { User, CreditCard, CheckCircle2, AlertCircle, Package, Users, Store, Wallet, Calendar, BarChart2, ShieldAlert } from "lucide-react";
import CallTranscriptWidget from "@/modules/widget/components/widget-component";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DCVTOKEN_ADDRESS = process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS;

// Use multiple RPC providers for better reliability
const FALLBACK_RPCS = [
  'https://rpc-amoy.polygon.technology/',
  'https://polygon-amoy-bor-rpc.publicnode.com'
];

// Function to get a working RPC provider
async function getWorkingProvider() {
  const rpcUrls = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com',
    RPC_URL // Try user's RPC last since it was giving errors
  ].filter(Boolean);

  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔗 Trying RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: 'polygon-amoy',
        chainId: 80002
      });

      // Test the connection
      const network = await provider.getNetwork();
      console.log(`✅ RPC working: ${rpcUrl} - Chain: ${network.chainId}`);
      return provider;
    } catch (error) {
      console.log(`❌ RPC failed: ${rpcUrl} - ${error.message}`);
      continue;
    }
  }

  throw new Error('No working RPC provider found');
}

const cardClass = "rounded-xl shadow border border-green-100 bg-white p-5 flex flex-col gap-2";
const statLabel = "text-xs text-gray-500 font-medium";
const statValue = "text-2xl font-bold text-green-900";
const statIcon = "h-6 w-6 text-green-600";

// Function to get the correct ABI from the merged structure
function getMergedABI() {
  const mergedABI = [];
  const seenFunctions = new Set();

  if (DiamondMergedABI.contracts) {
    Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
      const contractData = DiamondMergedABI.contracts[contractName];
      if (contractData.abi && Array.isArray(contractData.abi)) {
        contractData.abi.forEach(item => {
          const signature = item.type === 'function'
            ? `${item.name}(${item.inputs?.map(i => i.type).join(',') || ''})`
            : item.type;

          if (!seenFunctions.has(signature)) {
            seenFunctions.add(signature);
            mergedABI.push(item);
          }
        });
      }
    });
  }
  return mergedABI;
}

export default function ConsumerDashboard() {
  const searchParams = useSearchParams();
  const aadhaar = searchParams.get("aadhaar");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [unclaimedTokens, setUnclaimedTokens] = useState([]);
  const [hasMonthlyToken, setHasMonthlyToken] = useState(false);
  const [distributionHistory, setDistributionHistory] = useState(null);
  const [shopkeeper, setShopkeeper] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [rationAmounts, setRationAmounts] = useState(null);
  const [dcvTokens, setDcvTokens] = useState([]);
  const [fraudStatus, setFraudStatus] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  // New state variables for missing functions
  const [currentMonth, setCurrentMonth] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [tokenStatuses, setTokenStatuses] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [paymentCalculations, setPaymentCalculations] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);

  // Authentication check - ensure user has logged in properly
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      setError("Please log in to access your dashboard.");
      setLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(currentUser);
      if (userData.type !== 'consumer' || !userData.data) {
        setError("Invalid authentication. Please log in again.");
        setLoading(false);
        return;
      }

      // Verify the aadhaar from URL matches the logged-in user
      if (aadhaar && userData.data.aadharNumber !== aadhaar) {
        setError("Authentication mismatch. Please log in with the correct account.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setError("Authentication error. Please log in again.");
      setLoading(false);
      return;
    }
  }, [aadhaar]);

  useEffect(() => {
    if (!aadhaar) {
      setError("Aadhaar not provided.");
      setLoading(false);
      return;
    }

    // Additional authentication verification
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        console.log("🔐 Authenticated user data:", userData);
        if (userData.type === 'consumer' && userData.data.aadharNumber === aadhaar) {
          console.log("✅ Authentication verified for consumer:", userData.data.name);
        }
      } catch (error) {
        console.warn("⚠️ Could not parse user authentication data");
      }
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("🔍 Starting data fetch for aadhaar:", aadhaar);
        console.log("🔗 Contract address:", DIAMOND_PROXY_ADDRESS);

        if (!DIAMOND_PROXY_ADDRESS) {
          throw new Error("Contract address not configured");
        }

        // Use working RPC provider
        console.log("🔗 Finding working RPC provider...");
        const provider = await getWorkingProvider();

        // Use the same merged ABI approach as register-consumer route
        const contractABI = getMergedABI();
        console.log('📋 Contract ABI length:', contractABI.length);

        // Debug: List all available functions in the ABI
        const availableFunctions = contractABI
          .filter(item => item.type === 'function')
          .map(item => item.name);
        console.log('📋 Available functions in ABI:', availableFunctions.length);

        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, contractABI, provider);
        const aadhaarBigInt = BigInt(aadhaar);

        console.log("� Testing contract connection...");
        try {
          // Test contract connection first
          const network = await provider.getNetwork();
          console.log("✅ Connected to network:", network.name, "chainId:", network.chainId);

          // Test contract code exists
          const code = await provider.getCode(DIAMOND_PROXY_ADDRESS);
          if (code === '0x') {
            throw new Error('Contract not deployed at this address');
          }
          console.log("✅ Contract code found at address");
        } catch (connectionError) {
          console.error("❌ Contract connection failed:", connectionError);
          throw new Error("Failed to connect to blockchain: " + connectionError.message);
        }

        console.log("👤 Fetching consumer profile...");
        try {
          const profileData = await contract.getConsumerByAadhaar(aadhaarBigInt);
          console.log("✅ Profile data:", profileData);

          // Check if consumer exists (not zero address)
          if (!profileData || profileData.aadhaar.toString() === '0') {
            console.warn("⚠️ Consumer not found on blockchain");

            // Check which consumers are actually registered
            console.log("🔍 Checking for registered consumers...");
            try {
              // Try some test Aadhaar numbers that might be registered
              const testAadhaars = ['999888777666', '123456789012', '111111111111', '222222222222'];
              for (const testAadhaar of testAadhaars) {
                try {
                  const testProfile = await contract.getConsumerByAadhaar(BigInt(testAadhaar));
                  if (testProfile && testProfile.aadhaar.toString() !== '0') {
                    console.log(`✅ Found registered consumer: ${testAadhaar}`, testProfile);
                  }
                } catch (e) {
                  // Ignore individual test failures
                }
              }
            } catch (searchError) {
              console.warn("Could not search for registered consumers");
            }

            setError(`Consumer with Aadhaar ${aadhaar} not found on blockchain. 

🔍 This might mean:
1. The consumer hasn't been approved by admin yet
2. The Aadhaar number is incorrect
3. Try using Aadhaar: 999888777666 (recently registered consumer)

Please contact admin or check your registration status.`);
            return;
          }

          setProfile(profileData);

          // If we have profile data, fetch shopkeeper info
          if (profileData.assignedShopkeeper && profileData.assignedShopkeeper !== ethers.ZeroAddress) {
            console.log("🏪 Fetching shopkeeper info...");
            try {
              const shopkeeperInfo = await contract.getShopkeeperInfo(profileData.assignedShopkeeper);
              console.log("✅ Shopkeeper info:", shopkeeperInfo);
              setShopkeeper(shopkeeperInfo);
            } catch (shopkeeperError) {
              console.warn("⚠️ Shopkeeper info fetch failed:", shopkeeperError.message);
            }
          }

        } catch (profileError) {
          console.warn("⚠️ Profile fetch failed:", profileError.message);
          if (profileError.message.includes("execution reverted")) {
            setError(`Consumer with Aadhaar ${aadhaar} not found on blockchain.

🔍 Available test consumers:
- Aadhaar: 999888777666 (New Consumer - recently registered)
- Contact admin if you need to be registered

Please try with a registered Aadhaar number.`);
            return;
          }
          throw profileError;
        }

        // Fetch additional dashboard data
        console.log("📊 Fetching dashboard data...");
        const dashboardPromises = [];

        // Try to fetch dashboard data
        dashboardPromises.push(
          contract.getConsumerDashboard(aadhaarBigInt)
            .then(data => {
              console.log("✅ Dashboard data:", data);
              setDashboard(data);
            })
            .catch(err => {
              console.warn("⚠️ Dashboard fetch failed:", err.message);
              setDashboard(null);
            })
        );

        // Try to fetch unclaimed tokens from Diamond contract
        dashboardPromises.push(
          contract.getUnclaimedTokensByAadhaar(aadhaarBigInt)
            .then(tokens => {
              console.log("✅ Unclaimed tokens from Diamond:", tokens);
              setUnclaimedTokens(Array.isArray(tokens) ? tokens : []);
            })
            .catch(err => {
              console.warn("⚠️ Diamond unclaimed tokens fetch failed:", err.message);
              setUnclaimedTokens([]);
            })
        );

        // ALSO fetch tokens from DCVToken contract (this is where our new tokens are!)
        dashboardPromises.push(
          (async () => {
            try {
              console.log("🔍 Fetching tokens from DCVToken contract...");
              const dcvTokenContract = new ethers.Contract(DCVTOKEN_ADDRESS, DCVTokenABI, provider);

              // Get all tokens for this Aadhaar from DCVToken
              const allDCVTokens = await dcvTokenContract.getTokensByAadhaar(aadhaarBigInt);
              console.log("✅ All DCV tokens:", allDCVTokens);

              // Get unclaimed tokens from DCVToken
              const unclaimedDCVTokens = await dcvTokenContract.getUnclaimedTokensByAadhaar(aadhaarBigInt);
              console.log("✅ Unclaimed DCV tokens:", unclaimedDCVTokens);

              // If we have DCV tokens, use them (they're more recent)
              if (unclaimedDCVTokens.length > 0) {
                console.log("🎯 Using DCV tokens as primary unclaimed tokens");
                setUnclaimedTokens(unclaimedDCVTokens.map(id => Number(id)));
              }

              // Get detailed token data
              const dcvTokenDetails = [];
              for (const tokenId of allDCVTokens) {
                try {
                  const tokenData = await dcvTokenContract.getTokenData(tokenId);
                  dcvTokenDetails.push({
                    tokenId: Number(tokenId),
                    aadhaar: Number(tokenData.aadhaar),
                    rationAmount: Number(tokenData.rationAmount),
                    category: tokenData.category,
                    isClaimed: tokenData.isClaimed,
                    isExpired: tokenData.isExpired,
                    issuedTime: Number(tokenData.issuedTime),
                    expiryTime: Number(tokenData.expiryTime),
                    issuedDate: new Date(Number(tokenData.issuedTime) * 1000).toLocaleDateString(),
                    expiryDate: new Date(Number(tokenData.expiryTime) * 1000).toLocaleDateString()
                  });
                } catch (tokenError) {
                  console.warn(`Failed to get details for token ${tokenId}:`, tokenError.message);
                }
              }

              setDcvTokens(dcvTokenDetails);
              console.log("✅ DCV token details loaded:", dcvTokenDetails);

            } catch (dcvError) {
              console.warn("⚠️ DCVToken fetch failed:", dcvError.message);
              setDcvTokens([]);
            }
          })()
        );

        // Try to check monthly token status from Diamond contract
        dashboardPromises.push(
          contract.hasConsumerReceivedMonthlyToken(aadhaarBigInt)
            .then(hasToken => {
              console.log("✅ Has monthly token (Diamond):", hasToken);
              setHasMonthlyToken(hasToken);
            })
            .catch(err => {
              console.warn("⚠️ Diamond monthly token check failed:", err.message);
              setHasMonthlyToken(false);
            })
        );

        // ALSO check monthly token from DCVToken contract
        dashboardPromises.push(
          (async () => {
            try {
              console.log("🔍 Checking monthly token from DCVToken contract...");
              const dcvTokenContract = new ethers.Contract(DCVTOKEN_ADDRESS, DCVTokenABI, provider);

              const currentMonth = new Date().getMonth() + 1;
              const currentYear = new Date().getFullYear();

              const hasCurrentMonthToken = await dcvTokenContract.hasTokensForMonth(
                aadhaarBigInt,
                currentMonth,
                currentYear
              );

              console.log("✅ Has current month token (DCV):", hasCurrentMonthToken);

              // If DCVToken says we have a token, use that (it's more accurate)
              if (hasCurrentMonthToken) {
                setHasMonthlyToken(true);
              }

            } catch (dcvMonthlyError) {
              console.warn("⚠️ DCVToken monthly check failed:", dcvMonthlyError.message);
            }
          })()
        );

        // Try to fetch distribution history
        dashboardPromises.push(
          contract.getConsumerDistributionHistory(aadhaarBigInt, 6)
            .then(history => {
              console.log("✅ Distribution history:", history);
              setDistributionHistory(history);
            })
            .catch(err => {
              console.warn("⚠️ Distribution history fetch failed:", err.message);
              setDistributionHistory(null);
            })
        );

        // Try to fetch wallet address
        dashboardPromises.push(
          contract.getWalletByAadhaar(aadhaarBigInt)
            .then(walletAddr => {
              console.log("✅ Wallet address:", walletAddr);
              setWallet(walletAddr);
            })
            .catch(err => {
              console.warn("⚠️ Wallet fetch failed:", err.message);
              setWallet(null);
            })
        );

        // Try to fetch system stats
        dashboardPromises.push(
          Promise.resolve().then(async () => {
            try {
              const stats = await contract.getDashboardData();
              console.log("✅ System stats:", stats);
              setSystemStats(stats);
            } catch (statsError) {
              console.warn("⚠️ System stats fetch failed:", statsError.message);
              setSystemStats(null);
            }
          })
        );

        // Try to fetch ration amounts
        dashboardPromises.push(
          contract.getRationAmounts()
            .then(rationAmts => {
              console.log("✅ Ration amounts:", rationAmts);
              setRationAmounts(rationAmts);
            })
            .catch(err => {
              console.warn("⚠️ Ration amounts fetch failed:", err.message);
              setRationAmounts(null);
            })
        );

        // Wait for all dashboard data to complete (but don't fail if some fail)
        await Promise.allSettled(dashboardPromises);

      } catch (err) {
        console.error("❌ Dashboard fetch error:", err);
        setError("Failed to fetch dashboard data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [aadhaar]);

  const handleReportFraud = async () => {
    setFraudStatus(null);
    setFraudLoading(true);
    try {
      const res = await fetch("https://grainllyvoiceagent.onrender.com/api/report-fraud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ aadhaar: aadhaar }) // <-- fixed key spelling
      });
      if (res.ok) {
        setFraudStatus("Fraud report submitted successfully.");
      } else {
        setFraudStatus("Failed to submit fraud report.");
      }
    } catch (e) {
      setFraudStatus("Failed to submit fraud report.");
    }
    setFraudLoading(false);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-green-900 mb-4">Loading dashboard...</div>
        <div className="text-sm text-gray-600">Fetching data from blockchain for Aadhaar: {aadhaar}</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-red-600 mb-4">Error Loading Dashboard</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <div className="text-xs text-gray-500">
          <p>Aadhaar searched: {aadhaar}</p>
          {error.includes("log in") && (
            <div className="mt-4">
              <a
                href="/login"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium inline-block"
              >
                Go to Login Page
              </a>
            </div>
          )}
          {error.includes("Consumer not found") && (
            <p>Try using Aadhaar: 123456780012 (test consumer in the system)</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Welcome Message */}
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm text-green-800">
          {(() => {
            // Prioritize blockchain profile data over localStorage
            if (profile && profile.name) {
              return `Welcome back, ${profile.name}! 👋 (Blockchain verified)`;
            }

            // Fallback to localStorage if profile not loaded yet
            try {
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
              if (currentUser.data && currentUser.data.name) {
                return `Welcome back, ${currentUser.data.name}! 👋 (Loading blockchain data...)`;
              }
            } catch (error) {
              console.warn("Could not parse user data for welcome message");
            }
            return "Welcome to your Dashboard! 👋";
          })()}
        </div>

        {/* Debug info to help troubleshoot */}
        <div className="text-xs text-green-600 mt-2 p-2 bg-green-100 rounded">
          <strong>Debug Info:</strong><br />
          URL Aadhaar: {aadhaar}<br />
          Blockchain Profile Loaded: {profile ? 'Yes' : 'No'}<br />
          {profile && (
            <>
              Blockchain Name: {profile.name}<br />
              Blockchain Aadhaar: {profile.aadhaar?.toString()}<br />
            </>
          )}
          LocalStorage User: {(() => {
            try {
              const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
              return user.data ? `${user.data.name} (${user.data.aadharNumber})` : 'None';
            } catch {
              return 'Parse Error';
            }
          })()}
          <br />
          <strong className="text-orange-600">💡 Tip:</strong> If showing "Test Consumer", try logging in with Aadhaar: <code className="bg-white px-1">999888777666</code> (blockchain-registered consumer)
        </div>
      </div>

      <h1 className="text-3xl font-bold text-green-900 mb-6 flex items-center gap-2">
        <User className="h-7 w-7 text-green-700" /> Consumer Dashboard
      </h1>

      {/* Report Fraud Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleReportFraud}
          disabled={fraudLoading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow transition"
        >
          <ShieldAlert className="h-5 w-5" />
          {fraudLoading ? "Reporting..." : "Report Fraud"}
        </button>
      </div>
      {fraudStatus && (
        <div className={`mb-4 text-center font-semibold ${fraudStatus.includes("success") ? "text-green-700" : "text-red-600"}`}>
          {fraudStatus}
        </div>
      )}

      {/* Unclaimed Ration Token IDs */}
      {unclaimedTokens && unclaimedTokens.length > 0 && (
        <div className="mb-8">
          <div className="rounded-xl shadow border-2 border-green-400 bg-green-50 p-6 flex flex-col items-center">
            <div className="text-3xl font-bold text-green-900 mb-2">
              Your Unclaimed Ration Token IDs
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {unclaimedTokens.map((tokenId, i) => (
                <span key={i} className="text-2xl font-mono text-green-700 bg-white border border-green-200 rounded px-3 py-1">
                  #{tokenId.toString()}
                </span>
              ))}
            </div>
            <div className="text-green-800">
              Show any of these token numbers at your shop to collect your ration.
            </div>
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className={cardClass + " border-blue-100"}>
          <div className="flex items-center gap-2">
            <CreditCard className={statIcon + " bg-blue-50 rounded-full p-1"} />
            <span className={statLabel}>Unclaimed Tokens</span>
          </div>
          <span className={statValue}>{unclaimedTokens.length}</span>
        </div>
        <div className={cardClass + " border-green-100"}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={statIcon + " bg-green-50 rounded-full p-1"} />
            <span className={statLabel}>Current Month Token</span>
          </div>
          <span className={statValue}>{hasMonthlyToken ? "Yes" : "No"}</span>
        </div>
        <div className={cardClass + " border-yellow-100"}>
          <div className="flex items-center gap-2">
            <Package className={statIcon + " bg-yellow-50 rounded-full p-1"} />
            <span className={statLabel}>Active Tokens</span>
          </div>
          <span className={statValue}>{dashboard?.activeTokensCount?.toString() || 0}</span>
        </div>
        <div className={cardClass + " border-purple-100"}>
          <div className="flex items-center gap-2">
            <BarChart2 className={statIcon + " bg-purple-50 rounded-full p-1"} />
            <span className={statLabel}>Total Tokens</span>
          </div>
          <span className={statValue}>{dashboard?.totalTokensReceived?.toString() || 0}</span>
        </div>
      </div>

      {/* Profile & Shopkeeper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Profile */}
        {profile && (
          <div className={cardClass + " border-green-200"}>
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-green-700" /> Profile
            </h2>
            <div className="text-sm">
              <div><span className="font-medium">Name:</span> {profile.name}</div>
              <div><span className="font-medium">Aadhaar:</span> {profile.aadhaar?.toString()}</div>
              <div><span className="font-medium">Mobile:</span> {profile.mobile}</div>
              <div><span className="font-medium">Category:</span> {profile.category}</div>
              <div><span className="font-medium">Registered:</span> {profile.registrationTime ? new Date(Number(profile.registrationTime) * 1000).toLocaleString() : "N/A"}</div>
              <div><span className="font-medium">Status:</span> <span className={profile.isActive ? "text-green-700" : "text-red-600"}>{profile.isActive ? "Active" : "Inactive"}</span></div>
            </div>
          </div>
        )}
        {/* Shopkeeper */}
        {shopkeeper && (
          <div className={cardClass + " border-blue-200"}>
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-700" /> Assigned Shopkeeper
            </h2>
            <div className="text-sm">
              <div><span className="font-medium">Name:</span> {shopkeeper.name}</div>
              <div><span className="font-medium">Area:</span> {shopkeeper.area}</div>
              <div><span className="font-medium">Address:</span> {shopkeeper.shopkeeperAddress || shopkeeper.address}</div>
              <div><span className="font-medium">Status:</span> <span className={shopkeeper.isActive ? "text-green-700" : "text-red-600"}>{shopkeeper.isActive ? "Active" : "Inactive"}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Info */}
      {dashboard && (
        <div className={cardClass + " border-green-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-green-700" /> Dashboard Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Total Tokens Received:</span> {dashboard.totalTokensReceived?.toString()}</div>
            <div><span className="font-medium">Total Tokens Claimed:</span> {dashboard.totalTokensClaimed?.toString()}</div>
            <div><span className="font-medium">Active Tokens:</span> {dashboard.activeTokensCount?.toString()}</div>
            <div><span className="font-medium">Current Month Token:</span> {dashboard.hasCurrentMonthToken ? "Yes" : "No"}</div>
            <div><span className="font-medium">Monthly Ration Amount:</span> {dashboard.monthlyRationAmount?.toString()}</div>
            <div><span className="font-medium">Last Token Issued:</span> {dashboard.lastTokenIssuedTime ? new Date(Number(dashboard.lastTokenIssuedTime) * 1000).toLocaleString() : "N/A"}</div>
          </div>
        </div>
      )}

      {/* System Status Information */}
      {(currentMonth !== null || currentYear !== null || systemStatus !== null) && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {currentMonth !== null && (
                <div>
                  <span className="font-medium text-blue-800">Current Month:</span>
                  <span className="ml-2 text-blue-900">{currentMonth.toString()}</span>
                </div>
              )}
              {currentYear !== null && (
                <div>
                  <span className="font-medium text-blue-800">Current Year:</span>
                  <span className="ml-2 text-blue-900">{currentYear.toString()}</span>
                </div>
              )}
              {systemStatus !== null && (
                <div>
                  <span className="font-medium text-blue-800">System Status:</span>
                  <span className="ml-2 text-blue-900">{systemStatus.toString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Deliveries Alert */}
      {pendingDeliveries > 0 && (
        <div className="mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-900">
                You have {pendingDeliveries.toString()} pending delivery(ies)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unclaimed Tokens */}
      <div className={cardClass + " border-yellow-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-yellow-700" /> Unclaimed Tokens
        </h2>
        {unclaimedTokens && unclaimedTokens.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {unclaimedTokens.map((tokenId, i) => (
              <li key={i} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-yellow-800 font-mono">
                Token #{tokenId.toString()}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No unclaimed tokens.</div>
        )}
      </div>

      {/* Monthly Token Status */}
      <div className={cardClass + " border-green-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-700" /> Monthly Token Status
        </h2>
        <div className={hasMonthlyToken ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
          {hasMonthlyToken ? "You have received your token for this month." : "You have not received your token for this month."}
        </div>
      </div>

      {/* Distribution History */}
      <div className={cardClass + " border-blue-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-700" /> Distribution History (last 6 months)
        </h2>
        {distributionHistory && distributionHistory[0]?.length > 0 ? (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-green-50">
                <th className="p-2">Month</th>
                <th className="p-2">Year</th>
                <th className="p-2">Token Received</th>
                <th className="p-2">Token Claimed</th>
              </tr>
            </thead>
            <tbody>
              {distributionHistory[0].map((month, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2">{month}</td>
                  <td className="p-2">{distributionHistory[1][idx]}</td>
                  <td className="p-2">{distributionHistory[2][idx] ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <AlertCircle className="inline h-4 w-4 text-red-600" />}</td>
                  <td className="p-2">{distributionHistory[3][idx] ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <AlertCircle className="inline h-4 w-4 text-red-600" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No distribution history found.</div>
        )}
      </div>

      {/* Wallet Info */}
      <div className={cardClass + " border-purple-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-700" /> Linked Wallet
        </h2>
        <div className="font-mono text-sm break-all">
          {wallet && wallet !== ethers.ZeroAddress ? wallet : "No wallet linked"}
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className={cardClass + " border-green-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-700" /> System Stats
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Total Consumers:</span> {systemStats.totalConsumers?.toString()}</div>
            <div><span className="font-medium">Total Shopkeepers:</span> {systemStats.totalShopkeepers?.toString()}</div>
            <div><span className="font-medium">Total Delivery Agents:</span> {systemStats.totalDeliveryAgents?.toString()}</div>
            <div><span className="font-medium">Total Tokens Issued:</span> {systemStats.totalTokensIssued?.toString()}</div>
          </div>
        </div>
      )}

      {/* Ration Amounts */}
      {rationAmounts && (
        <div className={cardClass + " border-yellow-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-700" /> Ration Amounts Per Category
          </h2>
          <div className="flex flex-wrap gap-3">
            {rationAmounts.categories?.map((cat, idx) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-yellow-800 font-mono">
                {cat}: {rationAmounts.amounts[idx]?.toString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DCV Tokens */}
      {dcvTokens.length > 0 && (
        <div className={cardClass + " border-indigo-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-700" /> Your Ration Tokens (DCVToken)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dcvTokens.map((token) => (
              <div key={token.tokenId} className={`p-4 rounded-lg border-2 ${token.isClaimed
                ? 'bg-gray-50 border-gray-300'
                : token.isExpired
                  ? 'bg-red-50 border-red-300'
                  : 'bg-green-50 border-green-300'
                }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg">Token #{token.tokenId}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${token.isClaimed
                    ? 'bg-gray-200 text-gray-700'
                    : token.isExpired
                      ? 'bg-red-200 text-red-700'
                      : 'bg-green-200 text-green-700'
                    }`}>
                    {token.isClaimed ? 'CLAIMED' : token.isExpired ? 'EXPIRED' : 'AVAILABLE'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Amount:</span> {token.rationAmount}kg</div>
                  <div><span className="font-medium">Category:</span> {token.category}</div>
                  <div><span className="font-medium">Issued:</span> {token.issuedDate}</div>
                  <div><span className="font-medium">Expires:</span> {token.expiryDate}</div>
                </div>
                {!token.isClaimed && !token.isExpired && (
                  <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                    <strong>💡 Show this token number at your assigned shop to collect your ration!</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>📋 Total Tokens:</strong> {dcvTokens.length} |
            <strong className="ml-2">🎯 Available:</strong> {dcvTokens.filter(t => !t.isClaimed && !t.isExpired).length} |
            <strong className="ml-2">✅ Claimed:</strong> {dcvTokens.filter(t => t.isClaimed).length} |
            <strong className="ml-2">⏰ Expired:</strong> {dcvTokens.filter(t => t.isExpired).length}
          </div>
        </div>
      )}

      <CallTranscriptWidget />
    </div>
  );
}