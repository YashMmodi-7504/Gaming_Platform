import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

test.describe('World & Daily', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  test('World: Gaming City renders and a district link navigates', async ({ page }) => {
    await page.goto('/world');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /Gaming City/i })).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // The Casino District link (there are two: a building card + a legend chip).
    const casino = page.getByRole('link', { name: /Casino District/i }).first();
    await expect(casino).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await casino.click();

    // Navigates to /casino and mounts a page.
    await expect(page).toHaveURL(/\/casino/, { timeout: VISIBLE_TIMEOUT });
    await expect(page.locator('main').or(page.getByRole('heading')).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
  });

  test('Daily: SPIN reacts and Claim works when enabled', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /Daily/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // Spin the Lucky Wheel.
    const spin = page.getByRole('button', { name: /^SPIN$/i });
    await expect(spin).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await spin.click();

    // Wheel reacts: button becomes "Spinning…" (disabled) or a win toast fires.
    const spinReacted = page
      .getByRole('button', { name: /Spinning/i })
      .or(page.getByText(/You won|JACKPOT/i))
      .first();
    await expect(spinReacted).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // The daily "Claim +N" button — click only if enabled (not already claimed).
    const claim = page.getByRole('button', { name: /^Claim\b/i }).first();
    if (await claim.count()) {
      if (await claim.isEnabled()) {
        await claim.click();
        // A claim toast or the button switching to "Claimed today" confirms it.
        const claimed = page
          .getByText(/claimed/i)
          .or(page.getByRole('button', { name: /Claimed today/i }))
          .first();
        await expect(claimed).toBeVisible({ timeout: VISIBLE_TIMEOUT });
      } else {
        await expect(claim).toBeDisabled();
      }
    }
  });
});
