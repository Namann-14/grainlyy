'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import Link from 'next/link';

export default function DepotLayout({ children }) {
  const { connected, provider } = useMetaMask();
  const router = useRouter();
  
  // Add isMounted state to prevent hydration errors
  const [isMounted, setIsMounted] = useState(false);
  
  // Mark component as mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle redirections only on client-side after mounting
  useEffect(() => {
    if (isMounted && !connected) {
      router.push('/');
    }
  }, [isMounted, connected, router]);

  // Render the layout regardless of connection status during server-side rendering
  // This prevents hydration mismatches
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  RationChain
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/depot" className={`border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="text-sm px-4 py-2 rounded-md bg-gray-100">
                Depot Portal
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}