import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

/**
 * Playable-game smoke tests. These games are heavily animated (framer-motion +
 * requestAnimationFrame), so assertions are tolerant: we prove that the game
 * reacts to a launch, not exact multipliers or cards.
 */
test.describe('Playable games', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  test('Crash: launch starts a round and the multiplier readout reacts', async ({ page }) => {
    await page.goto('/crash');
    await page.waitForLoadState('domcontentloaded');

    // Idle stage prompt is visible before launch.
    await expect(
      page.getByText(/Place your bet & launch/i).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // "Launch · <bet>" button — match the leading word.
    const launch = page.getByRole('button', { name: /^Launch/i });
    await expect(launch).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await launch.click();

    // A 3-2-1 countdown then a running multiplier. Either the countdown "GO!"
    // or a "×" multiplier readout / "Cash Out" control proves the round began.
    const reacting = page
      .getByText(/GO!|In flight|Launching/i)
      .or(page.getByRole('button', { name: /Cash Out/i }))
      .or(page.getByText(/\d+\.\d{2}×/))
      .first();
    await expect(reacting).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Let the round settle; page must not have crashed (heading still present).
    await expect(
      page.getByRole('heading', { name: /multiplier/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Blackjack: deal reveals cards / a result area', async ({ page }) => {
    await page.goto('/arcade/blackjack');
    await page.waitForLoadState('domcontentloaded');

    // The game hero heading.
    await expect(
      page.getByRole('heading', { name: /Blackjack/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // "Deal · <bet>" button.
    const deal = page.getByRole('button', { name: /^Deal/i });
    await expect(deal).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await deal.click();

    // After dealing, either in-round action buttons appear, or a result banner,
    // or the dealer/you totals update. Any of these proves cards were dealt.
    const dealt = page
      .getByRole('button', { name: /^Hit$/i })
      .or(page.getByRole('button', { name: /^Stand$/i }))
      .or(page.getByRole('button', { name: /Deal again/i }))
      .or(page.getByText(/Blackjack!|Bust!|You win|Dealer wins|Push/i))
      .first();
    await expect(dealt).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });
});
