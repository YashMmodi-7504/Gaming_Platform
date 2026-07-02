import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + visual-regression config. Spins up the frontend dev server (demo mode
 * on, so the client-only demo login + wallet work without the backend) and runs
 * the specs in tests/e2e. The backend is optional — pages fall back to mock data.
 */
const PORT = Number(process.env.E2E_PORT ?? 3130);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Serial against `next dev` avoids overwhelming the on-demand route compiler
  // (parallel navigations cause ERR_ABORTED). CI can bump this after a prod build.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Deterministic viewport for visual tests.
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${PORT}`,
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api/v1',
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4100',
      NEXT_PUBLIC_DEMO_MODE: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
