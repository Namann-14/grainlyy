"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthLayout } from "@/components/auth-layout";

export function ConsumerSignup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pin, setPin] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    homeAddress: "",
    rationCardId: "",
    aadharNumber: "",
    familySize: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePinChange = (value) => {
    setPin(value);
  };

  // Function to validate consumer data against mock data
  const validateConsumerData = async () => {
    try {
      const response = await fetch("/mockdata.json");
      const mockData = await response.json();

      // Find a record that matches both ration card and aadhar number
      const matchingRecord = mockData.find(
        (record) =>
          record.rationCardNumber === formData.rationCardId &&
          record.aadhaar === formData.aadharNumber
      );

      if (!matchingRecord) {
        setError(
          "Invalid Ration Card ID or Aadhar number. Please verify your details."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating consumer data:", error);
      setError("Unable to verify your details. Please try again.");
      return false;
    }
  };

  const validateForm = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill in all required fields");
      return false;
    }

    if (
      !formData.homeAddress ||
      !formData.rationCardId ||
      !formData.aadharNumber
    ) {
      setError("Please fill in all consumer details");
      return false;
    }

    if (!pin || pin.length !== 6) {
      setError("Please enter a valid 6-digit PIN");
      return false;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must contain only numbers");
      return false;
    }

    // Additional validation for consumer data against mock data
    const isValidConsumer = await validateConsumerData();
    if (!isValidConsumer) {
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setIsLoading(true);
      setError(null);

      // Send consumer signup request to admin for approval
      const response = await fetch("/api/consumer-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          homeAddress: formData.homeAddress,
          rationCardId: formData.rationCardId,
          aadharNumber: formData.aadharNumber,
          familySize: formData.familySize,
          pin: pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit signup request");
        return;
      }

      // Show success message and redirect
      alert(
        "Signup request submitted successfully! Please wait for admin approval. You will be notified via email."
      );
      router.push("/signup-pending");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create a Consumer account"
      description="Sign up to access the Grainlyy platform"
    >
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
                <Home className="h-4 w-4" />
              </div>
              <CardTitle className="text-2xl text-green-900">
                Consumer Sign Up
              </CardTitle>
            </div>
            <CardDescription>
              Create a new consumer account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeAddress">
                  Home Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="homeAddress"
                  name="homeAddress"
                  placeholder="Enter your home address"
                  value={formData.homeAddress}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rationCardId">
                  Ration Card ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rationCardId"
                  name="rationCardId"
                  placeholder="Enter your ration card ID"
                  value={formData.rationCardId}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadharNumber">
                  Aadhar Card Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="aadharNumber"
                  name="aadharNumber"
                  placeholder="Enter your 12-digit Aadhar number"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  required
                  maxLength={12}
                  pattern="[0-9]{12}"
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="familySize">Family Size</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("familySize", value)
                  }
                  defaultValue={formData.familySize}
                >
                  <SelectTrigger className="border-green-200 focus-visible:ring-green-500">
                    <SelectValue placeholder="Select your family size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 person</SelectItem>
                    <SelectItem value="2-3">2-3 people</SelectItem>
                    <SelectItem value="4-5">4-5 people</SelectItem>
                    <SelectItem value="6+">6+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* PIN Input Section */}
              <div className="space-y-2">
                <Label htmlFor="pin">
                  Set Account PIN <span className="text-red-500">*</span>
                </Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={pin} onChange={handlePinChange}>
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
                  Enter a 6-digit PIN for account security
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Privacy Policy
                </Link>
              </div>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Creating account..." : "Create Consumer Account"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AuthLayout>
  );
}