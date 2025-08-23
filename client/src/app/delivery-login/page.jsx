"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Package
} from "lucide-react";

export default function DeliveryLogin() {
  const { connected, account, connectWallet } = useMetaMask();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agentInfo, setAgentInfo] = useState(null);

  useEffect(() => {
    if (connected && account) {
      checkDeliveryAgent();
    }
  }, [connected, account]);

  const checkDeliveryAgent = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch('/api/delivery-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: account
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.agent) {
        setAgentInfo(result.agent);
      } else {
        setError(result.error || "Not registered as a delivery agent");
      }
    } catch (error) {
      setError("Failed to verify delivery agent status");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (agentInfo) {
      router.push('/delivery');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Delivery Agent Login
            </CardTitle>
            <p className="text-gray-600">
              Connect your wallet to access the delivery dashboard
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Wallet Connection */}
            {!connected ? (
              <div className="space-y-4">
                <Button 
                  onClick={connectWallet}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Connect your MetaMask wallet to continue
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected Wallet Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Wallet Connected</span>
                  </div>
                  <p className="text-sm text-green-700 font-mono">
                    {account?.slice(0, 10)}...{account?.slice(-8)}
                  </p>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Verifying delivery agent status...</p>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      <br />
                      <span className="text-sm">
                        Please contact the admin to register as a delivery agent.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success State - Agent Info */}
                {agentInfo && !loading && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-800">Delivery Agent Verified</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{agentInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mobile:</span>
                          <span className="font-medium">{agentInfo.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <Badge className={agentInfo.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {agentInfo.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Deliveries:</span>
                          <span className="font-medium">{agentInfo.totalDeliveries || 0}</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleLogin}
                      className="w-full flex items-center justify-center gap-2"
                      size="lg"
                      disabled={!agentInfo.isActive}
                    >
                      Access Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </Button>

                    {!agentInfo.isActive && (
                      <p className="text-sm text-red-600 text-center">
                        Your account is inactive. Please contact the admin.
                      </p>
                    )}
                  </div>
                )}

                {/* Retry Button */}
                {error && !loading && (
                  <Button 
                    onClick={checkDeliveryAgent}
                    variant="outline"
                    className="w-full"
                  >
                    Retry Verification
                  </Button>
                )}
              </div>
            )}

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500">
              <p>Need help? Contact your system administrator</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}