import './globals.css';
import { MetaMaskProvider } from '@/components/MetaMaskProvider';
import { Toaster } from '@/components/ui/toaster';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: 'Grainlyyy',
  description: 'Blockchain-based Public Distribution System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          <MetaMaskProvider>
            {children}
          </MetaMaskProvider>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}