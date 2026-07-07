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
    void (async () => {
      const store = useAuthStore.getState();
      try {
        const tokens = await authApi.refresh();
        store.setAccessToken(tokens.accessToken);
        const user = await authApi.me();
        if (active) store.setSession(user, tokens.accessToken);
      } catch {
        if (!active) return;
        // No backend session. Restore a persisted demo session if present.
        const email =
          clientConfig.demoMode && typeof window !== 'undefined'
            ? window.localStorage.getItem(DEMO_SESSION_KEY)
            : null;
        if (email) {
          const { user, accessToken } = createDemoSession(email);
          store.setSession(user, accessToken);
          usePlayerProfile.getState().setUsername(email.split('@')[0] || 'player');
        } else {
          store.setInitialized(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
