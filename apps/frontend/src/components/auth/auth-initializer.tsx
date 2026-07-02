'use client';

import { useEffect } from 'react';

import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * On first mount, attempts a silent refresh using the httpOnly refresh cookie
 * and hydrates the session. Renders nothing.
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
        if (active) store.setInitialized(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return null;
}
