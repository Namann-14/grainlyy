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
    setWalletConnected(connected)
    setWalletAddress(account || "")
    
    if (account && activeTab === "wallet") {
      checkUserTypeAndRedirect(account)
    }
  }, [connected, account, activeTab])

  // Check user type and redirect for wallet users
  const checkUserTypeAndRedirect = async (address) => {
    try {
      setIsLoading(true)
      
      // Check if this is the admin address first
      if (address.toLowerCase() === ADMIN_ADDRESS) {
        console.log("Admin account detected, redirecting to admin dashboard")
        router.push("/admin")
        return
      }
      
      // For all other users, determine their type
      let foundUserType = null
      
      // Check wallet address against mock DB or calculate type
      const addressEnd = address.slice(-5)
      const sum = addressEnd.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      
      if (sum % 3 === 0) foundUserType = "dealer"
      else if (sum % 3 === 1) foundUserType = "depot"
      else foundUserType = "user"
      
      setUserType(foundUserType)
      
      // Immediately redirect based on user type
      if (foundUserType) {
        console.log(`Redirecting to ${foundUserType} dashboard`)
        router.push(`/${foundUserType}`)
      }
      
    } catch (err) {
      console.error("Error checking user type:", err)
      setError("Failed to verify wallet. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletConnect = (address) => {
    setWalletConnected(true)
    setWalletAddress(address)
    if (activeTab === "wallet") {
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

  // Consumer login function
  const handleConsumerLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

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

      // Make API call to verify consumer credentials
      const response = await fetch("/api/consumer-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: consumerData.identifier,
          identifierType: identifierType,
          pin: consumerData.pin
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        return
      }

      // Store consumer session data
      localStorage.setItem("consumerSession", JSON.stringify({
        id: data.consumer.id,
        name: data.consumer.name,
        phone: data.consumer.phone,
        loginTime: new Date().toISOString()
      }))

      // Redirect to consumer dashboard
      router.push("/user")

    } catch (err) {
      console.error("Consumer login error:", err)
      setError("Failed to authenticate. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Wallet login function
  const handleWalletLogin = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      if (!userType && walletAddress.toLowerCase() !== ADMIN_ADDRESS) {
        setError("This wallet is not registered. Please sign up first.")
        return
      }

      // Redirect based on user type or admin status
      if (walletAddress.toLowerCase() === ADMIN_ADDRESS) {
        router.push("/admin")
      } else if (userType) {
        router.push(`/dashboard/${userType}`)
      }
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
    if (!userType && walletAddress.toLowerCase() !== ADMIN_ADDRESS) return "Wallet Not Registered"
    return "Sign in"
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
                  Wallet
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
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                        <p>Wallet recognized as: <strong className="capitalize">{userType}</strong></p>
                      </div>
                    )}
                    {walletAddress.toLowerCase() === ADMIN_ADDRESS && (
                      <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-md text-sm">
                        <p>Wallet recognized as: <strong>Administrator</strong></p>
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

                {walletConnected && !userType && walletAddress.toLowerCase() !== ADMIN_ADDRESS && (
                  <div className="text-center text-sm">
                    <p className="text-amber-600">
                      This wallet is not registered. Please{" "}
                      <Link href="/signup" className="font-medium underline">
                        create an account
                      </Link>
                      {" "}first.
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
                (activeTab === "wallet" && (!walletConnected || (!userType && walletAddress.toLowerCase() !== ADMIN_ADDRESS)))
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