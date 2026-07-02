import { expect, test } from '@playwright/test';

import { authIndicator, demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
  });

  test('login page renders the welcome heading and demo button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Heading is "Welcome back" (split across spans) — match on "Welcome".
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
    await expect(page.getByRole('button', { name: /Continue as Demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
  });

  test('demo login lands on home with an authenticated header', async ({ page }) => {
    await demoLogin(page);

    // On '/' after login.
    await expect(page).toHaveURL(/\/$/, { timeout: VISIBLE_TIMEOUT });

    // Authenticated header shows the demo balance pill (Reload/Deposit) …
    await expect(authIndicator(page)).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // … and the home hero is visible.
    await expect(
      page.getByRole('heading', { name: /Future of Online Gaming/i }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('demo login also works via email + password + Sign in', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel('Email').fill('player@example.com');
    await page.getByLabel('Password', { exact: true }).fill('supersecret');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: VISIBLE_TIMEOUT });
    await expect(authIndicator(page)).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });
});
