"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Truck, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  User,
  Clock
} from "lucide-react";

export default function TestDeliveryWorkflow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const workflowSteps = [
    {
      id: 0,
      title: "Admin Assigns Pickup",
      description: "Admin creates a pickup task and assigns it to a delivery agent",
      actor: "Admin",
      status: "Assigned",
      statusCode: 0,
      icon: "📋",
      color: "blue"
    },
    {
      id: 1,
      title: "Agent Picks Up Ration",
      description: "Delivery agent goes to warehouse and marks ration as picked up",
      actor: "Delivery Agent",
      status: "Picked Up",
      statusCode: 1,
      icon: "📦",
      color: "yellow",
      action: "markRationPickedUp(pickupId)"
    },
    {
      id: 2,
      title: "Agent Travels to Shop",
      description: "Agent is in transit to the shopkeeper's location",
      actor: "Delivery Agent",
      status: "In Transit",
      statusCode: 2,
      icon: "🚚",
      color: "orange"
    },
    {
      id: 3,
      title: "Agent Delivers to Shop",
      description: "Agent reaches shopkeeper and marks delivery as completed",
      actor: "Delivery Agent",
      status: "Delivered",
      statusCode: 3,
      icon: "📍",
      color: "green",
      action: "markRationDeliveredToShop(pickupId)"
    },
    {
      id: 4,
      title: "Shopkeeper Confirms Receipt",
      description: "Shopkeeper verifies delivery and confirms receipt in the system",
      actor: "Shopkeeper",
      status: "Confirmed",
      statusCode: 4,
      icon: "✅",
      color: "green",
      action: "confirmRationReceipt(pickupId)"
    }
  ];

  const nextStep = () => {
    if (currentStep < workflowSteps.length - 1) {
      setLoading(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setLoading(false);
      }, 1000);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep(0);
  };

  const getStepColor = (stepId) => {
    if (stepId < currentStep) return "bg-green-100 border-green-300 text-green-800";
    if (stepId === currentStep) return "bg-blue-100 border-blue-300 text-blue-800";
    return "bg-gray-100 border-gray-300 text-gray-600";
  };

  const getStatusBadgeColor = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800",
      yellow: "bg-yellow-100 text-yellow-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800"
    };
    return colors[color] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🚚 Delivery Workflow Demonstration
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This demonstrates the complete delivery workflow from admin assignment to shopkeeper confirmation.
            Each step shows who is responsible and what action they need to take.
          </p>
        </div>

        {/* Current Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  {workflowSteps[currentStep].icon} {workflowSteps[currentStep].title}
                </h3>
                <p className="text-gray-600">{workflowSteps[currentStep].description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusBadgeColor(workflowSteps[currentStep].color)}>
                    Status: {workflowSteps[currentStep].status} (Code: {workflowSteps[currentStep].statusCode})
                  </Badge>
                  <Badge variant="outline">
                    Actor: {workflowSteps[currentStep].actor}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {currentStep < workflowSteps.length - 1 && (
                  <Button onClick={nextStep} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? "Processing..." : "Next Step"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                <Button onClick={resetWorkflow} variant="outline">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="relative">
              <Card className={`${getStepColor(step.id)} transition-all duration-300 ${
                step.id === currentStep ? 'shadow-lg scale-105' : ''
              }`}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{step.icon}</div>
                  <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                  <p className="text-xs opacity-75 mb-2">{step.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {step.actor}
                  </Badge>
                  {step.action && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs font-mono">
                      {step.action}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Arrow */}
              {index < workflowSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <ArrowRight className={`h-4 w-4 ${
                    index < currentStep ? 'text-green-500' : 'text-gray-400'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detailed Explanation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Problem Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                The Problem You Were Facing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issue:</strong> Deliveries were showing as "Delivered to Shop" but staying as "Pending delivery" 
                  because the shopkeeper wasn't confirming receipt.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-semibold">What was happening:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Delivery agent marks delivery (status becomes 3 = "Delivered")</li>
                  <li>• Shopkeeper dashboard shows "Pending delivery"</li>
                  <li>• No clear action for shopkeeper to confirm receipt</li>
                  <li>• Workflow gets stuck at step 3</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Solution Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                The Solution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Fixed:</strong> Added proper shopkeeper confirmation workflow with clear UI indicators 
                  and the missing confirmRationReceipt function call.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-semibold">What's now working:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Clear visual indicators when confirmation is needed</li>
                  <li>• Prominent "CONFIRM RECEIPT" button</li>
                  <li>• Proper status tracking (3 = Delivered, 4 = Confirmed)</li>
                  <li>• Complete workflow from assignment to confirmation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Function Reference */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Smart Contract Functions Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">Delivery Agent Functions</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• <code>markRationPickedUp(pickupId)</code></li>
                  <li>• <code>markRationDeliveredToShop(pickupId)</code></li>
                  <li>• <code>getMyPickups()</code></li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800">Shopkeeper Functions</h4>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>• <code>confirmRationReceipt(pickupId)</code></li>
                  <li>• <code>getMyShopPickups()</code></li>
                  <li>• <code>getShopkeeperDashboard(address)</code></li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800">Status Codes</h4>
                <ul className="text-sm text-purple-700 mt-2 space-y-1">
                  <li>• 0 = Assigned</li>
                  <li>• 1 = Picked Up</li>
                  <li>• 2 = In Transit</li>
                  <li>• 3 = Delivered (needs confirmation)</li>
                  <li>• 4 = Confirmed (complete)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <div className="mt-8 text-center space-x-4">
          <Button 
            onClick={() => window.open('/delivery', '_blank')} 
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Truck className="h-4 w-4 mr-2" />
            Open Delivery Dashboard
          </Button>
          <Button 
            onClick={() => window.open('/shopkeeper', '_blank')} 
            variant="outline"
            className="border-green-300 text-green-600 hover:bg-green-50"
          >
            <Package className="h-4 w-4 mr-2" />
            Open Shopkeeper Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}