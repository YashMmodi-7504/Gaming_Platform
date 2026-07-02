/**
 * Public runtime configuration. Only `NEXT_PUBLIC_*` variables are available
 * in the browser; everything here is safe to expose.
 */
export const clientConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Gaming Platform',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000',
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
  /**
   * Demo mode: when on, the login page accepts ANY non-empty credentials and
   * signs in a local Demo User without calling the backend — handy for design
   * review. Enabled in development or when NEXT_PUBLIC_DEMO_MODE=true.
   * PRODUCTION (NODE_ENV=production without the flag) keeps real auth.
   */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production',
} as const;

export type ClientConfig = typeof clientConfig;
