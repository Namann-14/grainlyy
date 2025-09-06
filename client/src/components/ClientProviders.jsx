'use client';

import { TranslationProvider } from '@/lib/i18n';

export default function ClientProviders({ children }) {
  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  );
}
