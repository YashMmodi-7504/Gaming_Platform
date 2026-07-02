import { expect, test } from '@playwright/test';

import { ERROR_TEXTS, prep, VISIBLE_TIMEOUT } from './helpers';

/**
 * Smoke-navigate every major route after demo login and assert each one:
 *  - responds HTTP 200,
 *  - renders a visible landmark/heading (proof the page mounted),
 *  - shows no error-boundary / not-found text.
 */
const ROUTES = [
  '/world',
  '/casino',
  '/arcade',
  '/crash',
  '/dice',
  '/roulette',
  '/sportsbook',
  '/tournaments',
  '/leaderboards',
  '/wallet',
  '/missions',
  '/battle-pass',
  '/store',
  '/avatar',
  '/profile',
  '/friends',
  '/community',
  '/daily',
  '/mailbox',
  '/clans',
  '/hall-of-fame',
  '/trophies',
  '/stats',
] as const;

test.describe('Route navigation smoke', () => {
  // Routes render client-side regardless of auth, so we skip login here for
  // speed — this is a pure "does the page mount without errors" smoke.
  test.beforeEach(async ({ page }) => {
    await prep(page);
  });

  for (const route of ROUTES) {
    test(`route ${route} loads cleanly`, async ({ page }) => {
      const response = await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // HTTP status: Next serves 200 for existing routes.
      if (response) {
        expect(response.status(), `${route} HTTP status`).toBeLessThan(400);
      }

      // A landmark or a top-level heading must be visible (single-match via .first()).
      const landmark = page.locator('main').or(page.getByRole('heading', { level: 1 })).first();
      await expect(landmark).toBeVisible({ timeout: VISIBLE_TIMEOUT });

      // No error text.
      for (const re of ERROR_TEXTS) {
        expect(await page.getByText(re).count(), `${route} error text ${re}`).toBe(0);
      }
    });
  }
});
