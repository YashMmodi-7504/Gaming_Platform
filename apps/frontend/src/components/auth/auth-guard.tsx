'use client';

import { Spinner } from '@gaming-platform/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Client-side route guard for authenticated sections (Phase 1.1).
 *
 * Reuses the existing auth store (no duplicate auth logic). While the initial
 * silent-refresh runs it shows a spinner; once resolved, guests are redirected
 * to /login and authenticated users see the page. Public routes (/, /login,
 * /signup, /register, /help, /forgot-password, …) are simply not wrapped.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !isAuthenticated) router.replace('/login');
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) return null; // redirecting to /login

  return <>{children}</>;
}
