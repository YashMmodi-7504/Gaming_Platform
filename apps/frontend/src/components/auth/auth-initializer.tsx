'use client';

import { useEffect } from 'react';

import { authApi } from '@/lib/auth-api';
import { clientConfig } from '@/lib/config';
import { createDemoSession, DEMO_SESSION_KEY } from '@/lib/demo-session';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * On first mount, attempts a silent refresh using the httpOnly refresh cookie
 * and hydrates the session. In demo mode, if a persisted demo session flag is
 * present (set at demo login), it restores that session instead — so a page
 * reload keeps the demo player signed in. Renders nothing.
 */
export function AuthInitializer() {
  useEffect(() => {
    let active = true;
    const store = useAuthStore.getState();

    // Demo fast-path: a persisted demo session is authoritative and available
    // synchronously in localStorage (set at guest login, cleared on logout).
    // Restore it immediately so the guarded shell paints on the first commit
    // instead of blocking behind a doomed backend /auth/refresh round-trip
    // (which has no backend in demo mode and only fails after a network
    // timeout). Real sessions — no demo flag — still refresh via the backend.
    const demoEmail =
      clientConfig.demoMode && typeof window !== 'undefined'
        ? window.localStorage.getItem(DEMO_SESSION_KEY)
        : null;
    if (demoEmail) {
      const { user, accessToken } = createDemoSession(demoEmail);
      store.setSession(user, accessToken);
      usePlayerProfile.getState().setUsername(demoEmail.split('@')[0] || 'player');
      return;
    }

    void (async () => {
      try {
        const tokens = await authApi.refresh();
        store.setAccessToken(tokens.accessToken);
        const user = await authApi.me();
        if (active) store.setSession(user, tokens.accessToken);
      } catch {
        if (active) store.setInitialized(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
