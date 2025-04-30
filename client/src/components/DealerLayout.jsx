'use client';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DealerLayout({ children }) {
  const { connected } = useMetaMask();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Set isClient flag when component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle redirects only on the client side after checking connection status
  useEffect(() => {
    if (isClient && !connected) {
      router.push('/');
    }
  }, [isClient, connected, router]);

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
                <Link href="/dealer" className={`border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="text-sm px-4 py-2 rounded-md bg-gray-100">
                Dealer Portal
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}