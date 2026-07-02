import { create } from 'zustand';

import { setAccessToken } from '@/lib/api-client';
import type { AuthUser } from '@/lib/auth-api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True once the initial silent-refresh attempt has completed. */
  initialized: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setInitialized: (value: boolean) => void;
  clearSession: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

/**
 * Client auth state. The access token lives in memory only and is mirrored to
 * the Axios client; the refresh token is an httpOnly cookie, so a page reload
 * re-authenticates silently via `/auth/refresh`.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  initialized: false,

  setSession: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, accessToken, isAuthenticated: true, initialized: true });
  },

  setUser: (user) => set({ user }),

  setAccessToken: (token) => {
    setAccessToken(token);
    set({ accessToken: token, isAuthenticated: true });
  },

  setInitialized: (value) => set({ initialized: value }),

  clearSession: () => {
    setAccessToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false, initialized: true });
  },

  hasPermission: (permission) => {
    const user = get().user;
    if (!user) return false;
    if (user.roles.includes('super_admin')) return true;
    return user.permissions.includes(permission);
  },

  hasRole: (role) => get().user?.roles.includes(role) ?? false,
}));
