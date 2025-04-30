import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/components/MetaMaskProvider';
import Layout from './Layout';

export default function AdminLayout({ children }) {
  const { connected } = useMetaMask();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  return (
    <Layout>
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-800 text-white">
          <div className="p-4">
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <nav className="mt-6">
            <a href="/admin" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
              Dashboard
            </a>
            <a href="/admin/assign" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
              Assign Delivery
            </a>
            <a href="/admin/users" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
              Manage Users
            </a>
            <a href="/admin/depots" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
              Manage Depots
            </a>
            <a href="/admin/delivery-persons" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
              Delivery Persons
            </a>
          </nav>
        </aside>
        
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Layout>
  );
}