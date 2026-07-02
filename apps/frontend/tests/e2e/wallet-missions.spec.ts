import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

/**
 * Economy flows: buying a cheap cosmetic in the store changes item state and
 * pops a toast; missions render claimable/in-progress cards. Assertions stay
 * resilient — we check for *some* expected element/toast, never exact numbers.
 */
test.describe('Wallet & missions economy', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  test('Store: buying an affordable item flips it to Owned/Equipped + toast', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Cosmetic Store/i }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Grab the first affordable item's Buy button.
    const buyButtons = page.getByRole('button', { name: /^Buy$/ });
    await expect(buyButtons.first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    const buyCount = await buyButtons.count();
    expect(buyCount).toBeGreaterThan(0);

    await buyButtons.first().click();

    // A success toast should appear (sonner), and/or an Owned/Equipped/Equip
    // control should now exist somewhere in the grid.
    const purchased = page
      .getByText(/Purchased/i)
      .or(page.getByRole('button', { name: /^Equip$/ }))
      .or(page.getByRole('button', { name: /Equipped/i }))
      .or(page.getByText(/^Owned$/))
      .first();
    await expect(purchased).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Daily: spinning the Lucky Wheel triggers a reward reaction', async ({ page }) => {
    await page.goto('/daily');
    await page.waitForLoadState('domcontentloaded');

    const spin = page.getByRole('button', { name: /^SPIN$/i });
    await expect(spin).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await spin.click();

    // Button goes to "Spinning…" (disabled) immediately, then a win toast.
    const reacted = page
      .getByRole('button', { name: /Spinning/i })
      .or(page.getByText(/You won|JACKPOT/i))
      .first();
    await expect(reacted).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Missions: cards render with Claim / In progress controls', async ({ page }) => {
    await page.goto('/missions');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Missions/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Section headings prove mission groups mounted.
    await expect(
      page.getByRole('heading', { name: /Daily Missions/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // At least one mission action exists: "Claim reward", "In progress", or
    // an already "Claimed" badge.
    const action = page
      .getByRole('button', { name: /Claim reward/i })
      .or(page.getByRole('button', { name: /In progress/i }))
      .or(page.getByText(/^Claimed$/i));
    await expect(action.first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });
});
