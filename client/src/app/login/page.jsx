// "use client"

// import { useState, useEffect } from "react"
// import { motion } from "framer-motion"
// import Link from "next/link"
// import { useRouter } from "next/navigation"
// import { Leaf, AlertCircle } from "lucide-react"

// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Label } from "@/components/ui/label"
// import { MetaMaskConnect } from "@/components/metamask-connect"
// import { AuthLayout } from "@/components/auth-layout"
// import { useMetaMask } from "@/components/MetaMaskProvider"

// export default function LoginPage() {
//   const router = useRouter()
//   const { connected, account } = useMetaMask()
//   const [isLoading, setIsLoading] = useState(false)
//   const [error, setError] = useState(null)
//   const [walletConnected, setWalletConnected] = useState(false)
//   const [walletAddress, setWalletAddress] = useState("")
//   const [userType, setUserType] = useState(null)

//   // Sync wallet state with MetaMask provider
//   useEffect(() => {
//     setWalletConnected(connected)
//     setWalletAddress(account || "")
    
//     if (account) {
//       checkUserType(account)
//     }
//   }, [connected, account])

//   // Check user type associated with wallet address
//   const checkUserType = async (address) => {
//     try {
//       setIsLoading(true)
      
//       // Simulate API call to check user role from database
//       // In a real app, this would query your backend
//       await new Promise(resolve => setTimeout(resolve, 1000))
      
//       // Simulated response - in a real app, you'd get this from your API
//       // For demo purposes, we'll use a random user type or fixed mapping
//       // In production, replace this with actual API call to your backend
      
//       // DEMO ONLY: Different logic for testing different roles
//       // const types = ["delivery", "vendor", "ngo"]
//       // const randomType = types[Math.floor(Math.random() * types.length)]
      
//       // DEMO ONLY: For fixed testing, uncomment this
//       let foundUserType = null
      
//       // Mock user database - replace with actual API call
//       const mockUserDB = {
//         "0x123456789abcdef": "delivery",
//         "0x987654321fedcba": "vendor",
//         "0xabcdef123456789": "ngo"
//       }
      
//       // Check if wallet exists in mock database
//       // In the simplest case, last 5 chars of address determine type
//       const addressEnd = address.slice(-5)
//       const sum = addressEnd.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      
//       if (sum % 3 === 0) foundUserType = "delivery"
//       else if (sum % 3 === 1) foundUserType = "vendor"
//       else foundUserType = "ngo"
      
//       // For demo purposes only - in real app you'd verify with your backend
//       setUserType(foundUserType)
//     } catch (err) {
//       console.error("Error checking user type:", err)
//       setError("Failed to verify wallet. Please try again.")
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleWalletConnect = (address) => {
//     setWalletConnected(true)
//     setWalletAddress(address)
//     checkUserType(address)
//   }

//   const handleLogin = async () => {
//     if (!walletConnected) {
//       setError("Please connect your wallet first")
//       return
//     }

//     try {
//       setIsLoading(true)
//       setError(null)

//       if (!userType) {
//         setError("This wallet is not registered. Please sign up first.")
//         return
//       }

//       // Simulate API authentication call
//       await new Promise((resolve) => setTimeout(resolve, 1000))
      
//       // Redirect based on user type
//       router.push(`/dashboard/${userType}`)
//     } catch (err) {
//       setError("Failed to authenticate. Please try again.")
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   // Get button text based on state
//   const getButtonText = () => {
//     if (isLoading) return "Signing in..."
//     if (!walletConnected) return "Connect Wallet to Sign In"
//     if (!userType) return "Wallet Not Registered"
//     return "Sign in"
//   }

//   return (
//     <AuthLayout title="Welcome back" description="Login to access your Grainlyy dashboard">
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5 }}
//         className="w-full max-w-md"
//       >
//         <Card className="border-green-100 shadow-md">
//           <CardHeader className="space-y-1">
//             <div className="flex items-center gap-2">
//               <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white">
//                 <Leaf className="h-4 w-4" />
//               </div>
//               <CardTitle className="text-2xl text-green-900">Sign in</CardTitle>
//             </div>
//             <CardDescription>Connect with MetaMask to access your account</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {error && (
//               <motion.div
//                 initial={{ opacity: 0, height: 0 }}
//                 animate={{ opacity: 1, height: "auto" }}
//                 className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
//               >
//                 <div className="flex items-center gap-2">
//                   <AlertCircle className="h-4 w-4" />
//                   <span>{error}</span>
//                 </div>
//               </motion.div>
//             )}

//             <MetaMaskConnect onConnect={handleWalletConnect} />

//             {walletConnected && (
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ delay: 0.2 }}
//                 className="space-y-4"
//               >
//                 {userType && (
//                   <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
//                     <p>Wallet recognized as: <strong className="capitalize">{userType}</strong></p>
//                   </div>
//                 )}
                
//                 <div className="flex items-center space-x-2">
//                   <Checkbox id="remember" />
//                   <Label htmlFor="remember" className="text-sm text-muted-foreground">
//                     Remember this device
//                   </Label>
//                 </div>
//               </motion.div>
//             )}
//           </CardContent>
//           <CardFooter className="flex flex-col space-y-4">
//             <Button
//               onClick={handleLogin}
//               disabled={!walletConnected || isLoading || !userType}
//               className="w-full bg-green-600 hover:bg-green-700"
//             >
//               {getButtonText()}
//             </Button>
//             <div className="text-center text-sm text-muted-foreground">
//               Don&apos;t have an account?{" "}
//               <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
//                 Sign up
//               </Link>
//             </div>
            
//             {walletConnected && !userType && (
//               <div className="text-center text-sm">
//                 <p className="text-amber-600">
//                   This wallet is not registered. Please{" "}
//                   <Link href="/signup" className="font-medium underline">
//                     create an account
//                   </Link>
//                   {" "}first.
//                 </p>
//               </div>
//             )}
//           </CardFooter>
//         </Card>
//       </motion.div>
//     </AuthLayout>
//   )
// }

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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

  // Sync wallet state with MetaMask provider and immediately redirect if authenticated
  useEffect(() => {
    setWalletConnected(connected)
    setWalletAddress(account || "")
    
    if (account) {
      checkUserTypeAndRedirect(account)
    }
  }, [connected, account])

  // Check user type and immediately redirect to appropriate dashboard
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
    checkUserTypeAndRedirect(address) // Immediately attempt redirect on connect
  }

  // Keeping the manual login button as fallback
  const handleLogin = async () => {
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

  // Get button text based on state
  const getButtonText = () => {
    if (isLoading) return "Signing in..."
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
            <CardDescription>Connect with MetaMask to access your account</CardDescription>
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
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground">
                    Remember this device
                  </Label>
                </div>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleLogin}
              disabled={!walletConnected || isLoading || (!userType && walletAddress.toLowerCase() !== ADMIN_ADDRESS)}
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
          </CardFooter>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}