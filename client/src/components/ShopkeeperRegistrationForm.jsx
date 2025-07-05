'use client';
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Store, User, MapPin, Loader2 } from "lucide-react";

export function ShopkeeperRegistrationForm({ onSuccess, onError }) {
  const [formData, setFormData] = useState({
    shopkeeperAddress: '',
    name: '',
    area: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.shopkeeperAddress || !formData.name || !formData.area) {
      onError('All fields are required');
      return false;
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.shopkeeperAddress)) {
      onError('Invalid Ethereum address format');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      onError(''); // Clear any previous errors

      console.log('🏪 Registering shopkeeper:', formData);

      const response = await fetch('/api/admin?endpoint=register-shopkeeper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(`✅ Shopkeeper "${formData.name}" registered successfully! TX: <a href="${data.polygonScanUrl}" target="_blank" class="underline">${data.txHash.slice(0, 10)}... ↗</a>`);
        
        // Reset form
        setFormData({
          shopkeeperAddress: '',
          name: '',
          area: ''
        });
      } else {
        onError(`❌ Registration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      onError(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shopkeeperAddress" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Shopkeeper Wallet Address
          </Label>
          <Input
            id="shopkeeperAddress"
            name="shopkeeperAddress"
            type="text"
            placeholder="0x..."
            value={formData.shopkeeperAddress}
            onChange={handleInputChange}
            disabled={loading}
            className="font-mono text-sm"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Shop Name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="RJ Kirana Store"
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="area" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Area/Location
          </Label>
          <Input
            id="area"
            name="area"
            type="text"
            placeholder="Sector 21, Dwarka"
            value={formData.area}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering on Blockchain...
            </>
          ) : (
            <>
              <Store className="mr-2 h-4 w-4" />
              Register Shopkeeper
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
