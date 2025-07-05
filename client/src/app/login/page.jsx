"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, AlertCircle, User, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { MetaMaskConnect } from "@/components/metamask-connect"
import { AuthLayout } from "@/components/auth-layout"
import { useMetaMask } from "@/components/MetaMaskProvider"

// Admin address constant
const ADMIN_ADDRESS = "0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa".toLowerCase();

export default function LoginPage() {
  const router = useRouter()
  const { connected, account } = useMetaMask()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [userType, setUserType] = useState(null)
  const [activeTab, setActiveTab] = useState("consumer")

  // Consumer login state
  const [consumerData, setConsumerData] = useState({
    identifier: "", // Can be Aadhar or Ration Card ID
    pin: ""
  })
  const [identifierType, setIdentifierType] = useState("aadhar") // 'aadhar' or 'ration'

  // Sync wallet state with MetaMask provider
  useEffect(() => {
    console.log("🔄 Wallet state changed - connected:", connected, "account:", account)
    setWalletConnected(connected)
    setWalletAddress(account || "")
    
    // Always check and redirect when wallet is connected, regardless of active tab
    if (account && connected) {
      console.log("🚀 Wallet connected, checking user type and redirecting...")
      checkUserTypeAndRedirect(account)
    }
  }, [connected, account])

  // Enhanced wallet checking function
  const checkUserTypeAndRedirect = async (address) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("🔍 Checking wallet address:", address)
      
      // Check if this is the admin address first
      if (address.toLowerCase() === ADMIN_ADDRESS) {
        console.log("👑 Admin account detected, redirecting to admin dashboard")
        setUserType("admin")
        localStorage.setItem('currentUser', JSON.stringify({
          type: 'admin',
          address: address
        }));
        window.location.href = "/admin" // Force immediate redirect
        return
      }
      
      // Check if wallet belongs to a shopkeeper
      try {
        console.log("🔍 Checking shopkeeper for wallet:", address);
        const shopkeeperResponse = await fetch(`/api/shopkeeper-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        console.log("🔍 Shopkeeper response status:", shopkeeperResponse.status);
        const shopkeeperData = await shopkeeperResponse.json();
        console.log("🔍 Shopkeeper response data:", shopkeeperData);

        if (shopkeeperResponse.ok && shopkeeperData.success && shopkeeperData.shopkeeper) {
          console.log("🏪 Shopkeeper account detected, redirecting to depot dashboard");
          console.log("📊 Shopkeeper data source:", shopkeeperData.shopkeeper.source);
          setUserType("depot")
          // Store shopkeeper info in localStorage for the dashboard
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'shopkeeper',
            data: shopkeeperData.shopkeeper
          }));
          
          window.location.href = "/depot" // Force immediate redirect
          return
        } else if (shopkeeperResponse.ok && !shopkeeperData.success && shopkeeperData.error) {
          console.log("❌ Shopkeeper check returned error:", shopkeeperData.error);
        }
      } catch (shopkeeperError) {
        console.log("⚠️ Shopkeeper check failed:", shopkeeperError.message)
      }
      
      // Check if wallet belongs to an approved delivery partner
      try {
        console.log("🔍 Checking delivery partner for wallet:", address);
        const deliveryResponse = await fetch(`/api/delivery-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        console.log("🔍 Delivery response status:", deliveryResponse.status);
        const deliveryData = await deliveryResponse.json();
        console.log("🔍 Delivery response data:", deliveryData);

        if (deliveryResponse.ok && deliveryData.success && deliveryData.deliveryPartner) {
          console.log("🚚 Delivery partner account detected, redirecting to dealer dashboard")
          console.log("📊 Delivery partner data source:", deliveryData.deliveryPartner.source);
          setUserType("dealer")
          // Store delivery partner info in localStorage for the dashboard
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'delivery',
            data: deliveryData.deliveryPartner
          }));
          window.location.href = "/dealer" // Force immediate redirect
          return
        } else if (deliveryResponse.ok && !deliveryData.success && deliveryData.error) {
          console.log("❌ Delivery partner check returned error:", deliveryData.error);
        }
      } catch (deliveryError) {
        console.log("⚠️ Delivery partner check failed:", deliveryError.message)
      }
      
      // Check if wallet is linked to a consumer
      try {
        console.log("🔍 Checking consumer wallet for wallet:", address);
        const consumerWalletResponse = await fetch(`/api/consumer-wallet-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        console.log("🔍 Consumer wallet response status:", consumerWalletResponse.status);
        const consumerWalletData = await consumerWalletResponse.json();
        console.log("🔍 Consumer wallet response data:", consumerWalletData);

        if (consumerWalletResponse.ok && consumerWalletData.consumer) {
          console.log("👤 Consumer wallet detected, redirecting to user dashboard")
          setUserType("user")
          // Store consumer info in localStorage for the dashboard
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'consumer',
            data: consumerWalletData.consumer
          }));
          window.location.href = `/user?aadhaar=${consumerWalletData.consumer.aadharNumber}` // Force immediate redirect
          return
        }
      } catch (consumerWalletError) {
        console.log("⚠️ Consumer wallet check failed:", consumerWalletError.message)
      }
      
      // If no specific role found, show proper error message
      console.log("❌ No role found for wallet address:", address);
      setError("This wallet address is not registered in the system. Please register first or contact your administrator.")
      setUserType(null)
      
    } catch (err) {
      console.error("❌ Error checking user type:", err)
      setError("Failed to verify wallet. Please try again.")
      setUserType(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletConnect = (address) => {
    console.log("🔗 Wallet connect handler called with address:", address)
    setWalletConnected(true)
    setWalletAddress(address)
    // Always check and redirect immediately when wallet connects
    if (address) {
      checkUserTypeAndRedirect(address)
    }
  }

  // Handle consumer data input
  const handleConsumerInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'identifier') {
      // Only allow digits for both Aadhar and Ration ID
      const digitsOnly = value.replace(/\D/g, '')
      const maxLength = identifierType === 'aadhar' ? 12 : 20 // Flexible length for ration card
      
      if (digitsOnly.length <= maxLength) {
        setConsumerData(prev => ({ ...prev, [name]: digitsOnly }))
      }
    } else {
      setConsumerData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handlePinChange = (value) => {
    setConsumerData(prev => ({ ...prev, pin: value }))
  }

  const handleConsumerLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔐 Consumer login attempt:", {
        identifier: consumerData.identifier,
        identifierType,
        pinLength: consumerData.pin.length
      });

      // Validate inputs
      if (!consumerData.identifier || !consumerData.pin) {
        setError("Please enter both identifier and PIN")
        return
      }

      if (identifierType === 'aadhar' && !/^\d{12}$/.test(consumerData.identifier)) {
        setError("Aadhar number must be exactly 12 digits")
        return
      }

      if (!/^\d{6}$/.test(consumerData.pin)) {
        setError("PIN must be exactly 6 digits")
        return
      }

      // For testing purposes, allow the blockchain consumer to login with any PIN
      if (consumerData.identifier === "123456780012") {
        console.log("🧪 Test consumer detected, redirecting to dashboard");
        router.push(`/user?aadhaar=${consumerData.identifier}`);
        return;
      }

      console.log("📤 Sending login request to API...");
      // Call API
      const response = await fetch("/api/consumer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: consumerData.identifier,
          identifierType,
          pin: consumerData.pin,
        }),
      });

      console.log("📥 API response status:", response.status);
      const data = await response.json();
      console.log("📥 API response data:", data);

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Redirect to consumer dashboard with aadhaar in URL
      console.log("✅ Login successful, redirecting to user dashboard");
      router.push(`/user?aadhaar=${data.consumer.aadharNumber}`);
    } catch (error) {
      console.error("❌ Consumer login error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced wallet login function
  const handleWalletLogin = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // The checking and redirection is already handled in checkUserTypeAndRedirect
      // This is called when the user manually clicks the login button
      await checkUserTypeAndRedirect(walletAddress)

    } catch (err) {
      setError("Failed to authenticate. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Get button text based on current tab and state
  const getButtonText = () => {
    if (isLoading) return "Signing in..."
    
    if (activeTab === "consumer") {
      return "Sign in as Consumer"
    }
    
    if (!walletConnected) return "Connect Wallet to Sign In"
    if (userType) return `Sign in as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
    return "Checking Registration..."
  }

  // Get user type display text
  const getUserTypeDisplay = () => {
    switch(userType) {
      case "admin": return "Administrator"
      case "depot": return "Shopkeeper"
      case "dealer": return "Delivery Partner"
      case "user": return "Consumer"
      default: return null
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Login to access your Grainlyy dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-green-100 shadow-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white">
                <Leaf className="h-4 w-4" />
              </div>
              <CardTitle className="text-2xl text-green-900">Sign in</CardTitle>
            </div>
            <CardDescription>Choose your login method</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="consumer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Consumer
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet Login
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="consumer" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Login with</Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="identifierType"
                          value="aadhar"
                          checked={identifierType === "aadhar"}
                          onChange={(e) => {
                            setIdentifierType(e.target.value)
                            setConsumerData(prev => ({ ...prev, identifier: "" }))
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm">Aadhar Number</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="identifierType"
                          value="ration"
                          checked={identifierType === "ration"}
                          onChange={(e) => {
                            setIdentifierType(e.target.value)
                            setConsumerData(prev => ({ ...prev, identifier: "" }))
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm">Ration Card ID</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {identifierType === "aadhar" ? "Aadhar Number" : "Ration Card ID"}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="identifier"
                      name="identifier"
                      placeholder={
                        identifierType === "aadhar" 
                          ? "Enter your 12-digit Aadhar number" 
                          : "Enter your Ration Card ID"
                      }
                      value={consumerData.identifier}
                      onChange={handleConsumerInputChange}
                      className="border-green-200 focus-visible:ring-green-500"
                    />
                    {identifierType === "aadhar" && (
                      <p className="text-xs text-muted-foreground">
                        {consumerData.identifier.length}/12 digits
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pin">
                      Account PIN <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={consumerData.pin} onChange={handlePinChange}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={1} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={2} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={3} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={4} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={5} className="border-green-200 focus-visible:ring-green-500" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Enter your 6-digit PIN ({consumerData.pin.length}/6)
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="wallet" className="space-y-4 mt-4">
                <MetaMaskConnect onConnect={handleWalletConnect} />

                {walletConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    {userType && (
                      <div className={`border px-4 py-3 rounded-md text-sm ${
                        userType === 'admin' 
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        <p>Wallet recognized as: <strong>{getUserTypeDisplay()}</strong></p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember-wallet" />
                      <Label htmlFor="remember-wallet" className="text-sm text-muted-foreground">
                        Remember this device
                      </Label>
                    </div>
                  </motion.div>
                )}

                {walletConnected && !userType && !isLoading && (
                  <div className="text-center text-sm">
                    <p className="text-amber-600">
                      Wallet not recognized in the system
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={activeTab === "consumer" ? handleConsumerLogin : handleWalletLogin}
              disabled={
                isLoading || 
                (activeTab === "consumer" && (!consumerData.identifier || !consumerData.pin)) ||
                (activeTab === "wallet" && !walletConnected)
              }
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {getButtonText()}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}