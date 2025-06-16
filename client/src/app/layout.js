import './globals.css';
import { MetaMaskProvider } from '@/components/MetaMaskProvider';

export const metadata = {
  title: 'Grainlyyy',
  description: 'Blockchain-based Public Distribution System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MetaMaskProvider>
          {children}
        </MetaMaskProvider>
      </body>
    </html>
  );
}