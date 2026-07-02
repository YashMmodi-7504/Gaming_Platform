'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { AuthInitializer } from '@/components/auth/auth-initializer';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

/**
 * Composes every client-side provider in a single tree mounted at the root
 * layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light" disableTransitionOnChange>
      <QueryProvider>
        <AuthInitializer />
        {children}
        <Toaster richColors position="top-right" theme="light" />
      </QueryProvider>
    </ThemeProvider>
  );
}
