import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSDK } from '@metamask/sdk-react';
import AdminLayout from '../../components/AdminLayout';
import { getContract } from '../../utils/contract';
import { ethers } from 'ethers';

export default function AssignDelivery() {
  const { connected, provider } = useSDK();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [userId, setUserId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Connect to contract
        const signer = provider.getSigner();
        const contract = getContract(signer);
        
        // In a real app, we would fetch users and delivery persons
        // For demo, we'll use placeholders
        setUsers([
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' },
        ]);
        
        setDeliveryPersons([
          { id: 1, name: 'Delivery Person 1' },
          { id: 2, name: 'Delivery Person 2' },
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [connected, provider, router]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Connect to contract
      const signer = provider.getSigner();
      const contract = getContract(signer);
      
      // Convert amount to wei
      const amountInWei = ethers.utils.parseEther(amount);
      
      // Allocate ration
      const tx = await contract.allocateRation(userId, deliveryPersonId, amountInWei);
      await tx.wait();
      
      router.push('/admin');
    } catch (error) {
      console.error('Error allocating ration:', error);
      alert('Failed to allocate ration');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>Assign Delivery | Grainlyyy</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Assign New Delivery</h1>
        
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="userId">
                  Beneficiary
                </label>
                <select
                  id="userId"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                >
                  <option value="">Select Beneficiary</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deliveryPersonId">
                  Delivery Person
                </label>
                <select
                  id="deliveryPersonId"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={deliveryPersonId}
                  onChange={(e) => setDeliveryPersonId(e.target.value)}
                  required
                >
                  <option value="">Select Delivery Person</option>
                  {deliveryPersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                  Amount (ETH)
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.0001"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={submitting}
                >
                  {submitting ? 'Assigning...' : 'Assign Delivery'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
