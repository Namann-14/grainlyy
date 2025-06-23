import { useState } from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

export default function AdminTransactionButton({ 
  functionName, 
  params, 
  children, 
  className,
  onSuccess,
  onError
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTransaction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/blockchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName,
          params: params || [],
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed');
      }
      
      if (onSuccess) onSuccess(data);
    } catch (error) {
      console.error('Transaction error:', error);
      if (onError) onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTransaction} 
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}