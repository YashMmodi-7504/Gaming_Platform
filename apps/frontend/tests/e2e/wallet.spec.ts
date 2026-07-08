import { expect, test } from '@playwright/test';

import { authIndicator, VISIBLE_TIMEOUT } from './helpers';

/**
 * Phase 1.2 — wallet foundation: header balance, deposit, withdraw, and the
 * zero-balance bet restriction. These tests intentionally start at ₹0 (they do
 * NOT seed the wallet like the shared prep()), so deposits/withdrawals persist.
 */
test.describe('Wallet (Phase 1.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('gp-intro-seen', '1');
        localStorage.setItem('a11y-reduce', '1');
        localStorage.setItem('gp-demo-session', 'guest@player.gg'); // authenticated
        // No gp-wallet seed → balance starts at ₹0.
      } catch {
        /* ignore */
      }
    });
  });

  test('betting is blocked at ₹0 and a deposit unlocks it', async ({ page }) => {
    // Browsing the detail page is never blocked.
    await page.goto('/casino/andar-bahar');
    await expect(page.getByRole('link', { name: /Play now/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // The play surface shows the deposit prompt, not a bet control.
    await page.goto('/casino/andar-bahar/play');
    await expect(page.getByText(/deposit funds before placing bets/i)).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
    await expect(page.getByRole('button', { name: /^(Deal|Spin|Roll)/i })).toHaveCount(0);

    // Deposit Now → /deposit, then fund ₹1,000.
    await page.getByRole('link', { name: /Deposit Now/i }).click();
    await expect(page).toHaveURL(/\/deposit$/, { timeout: VISIBLE_TIMEOUT });
    await page.getByRole('button', { name: '₹1,000', exact: true }).click();
    await page.getByRole('button', { name: /^Deposit ₹1,000$/i }).click();
    await expect(authIndicator(page)).toContainText('1,000', { timeout: VISIBLE_TIMEOUT });

    // Now the game is playable (deposit persisted).
    await page.goto('/casino/andar-bahar/play');
    await expect(page.getByRole('button', { name: /^(Deal|Spin|Roll)/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
  });

  test('deposit then withdraw — cannot exceed the balance', async ({ page }) => {
    // Fund ₹5,000.
    await page.goto('/deposit');
    await page.getByRole('button', { name: '₹5,000', exact: true }).click();
    await page.getByRole('button', { name: /^Deposit ₹5,000$/i }).click();
    await expect(authIndicator(page)).toContainText('5,000', { timeout: VISIBLE_TIMEOUT });

    // Over-withdraw is blocked.
    await page.goto('/withdraw');
    const amount = page.getByPlaceholder('Enter amount');
    await amount.fill('999999');
    await expect(page.getByText(/exceeds your balance/i)).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await expect(page.getByRole('button', { name: /^Withdraw/i })).toBeDisabled();

    // A valid withdrawal updates the header balance (5,000 − 2,000 = 3,000).
    await amount.fill('2000');
    await page.getByRole('button', { name: /^Withdraw ₹2,000$/i }).click();
    await expect(authIndicator(page)).toContainText('3,000', { timeout: VISIBLE_TIMEOUT });
  });
});
