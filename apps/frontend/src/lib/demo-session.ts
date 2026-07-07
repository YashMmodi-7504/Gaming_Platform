import type { AuthUser } from '@/lib/auth-api';

/** localStorage key that persists a demo session across reloads (demo mode only). */
export const DEMO_SESSION_KEY = 'gp-demo-session';

/** Persist / clear the demo session flag (client-only; safe no-op on the server). */
export function persistDemoSession(email: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_SESSION_KEY, email);
}
export function clearDemoSession(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(DEMO_SESSION_KEY);
}

/**
 * Builds a local Demo User + a clearly-fake dev token. Used ONLY when
 * `clientConfig.demoMode` is on (development / NEXT_PUBLIC_DEMO_MODE). This never
 * runs in production and never touches the backend — the real auth flow is left
 * completely intact.
 */
export function createDemoSession(email: string): { user: AuthUser; accessToken: string } {
  const handle = email.split('@')[0] || 'player';
  const username = handle.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'demo_player';
  const now = new Date().toISOString();

  const user: AuthUser = {
    id: 'demo-user',
    email,
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    avatarUrl: null,
    role: 'USER',
    roles: ['user'],
    permissions: [],
    status: 'ACTIVE',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: now,
    lastLoginAt: now,
  };

  // A non-functional placeholder token; the demo session is purely client-side.
  const accessToken = `demo.${btoa(username)}.session`;
  return { user, accessToken };
}
