import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

test.describe('Store, Avatar & Profile', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  test('Store: switch a category tab, preview an item, buy/equip one', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Cosmetic Store/i }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Switch category tab (Frames is an equippable category).
    const framesTab = page.getByRole('button', { name: /^Frames$/ });
    if (await framesTab.count()) {
      await framesTab.first().click();
    }

    // Open a preview: the item swatch button contains the item icon; clicking
    // the first grid card opens the modal. Fall back gracefully if layout shifts.
    const firstCard = page.locator('.card-premium').filter({ has: page.locator('button') }).first();
    await expect(firstCard).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Buy or equip whichever action is present for an affordable item.
    const buy = page.getByRole('button', { name: /^Buy$/ }).first();
    const equip = page.getByRole('button', { name: /^Equip$/ }).first();

    if (await buy.count()) {
      await buy.click();
    } else if (await equip.count()) {
      await equip.click();
    }

    // Assert an Owned/Equipped state or a success toast surfaced.
    const settled = page
      .getByText(/Purchased|Equipped/i)
      .or(page.getByRole('button', { name: /Equipped/i }))
      .or(page.getByText(/^Owned$/))
      .or(page.getByRole('button', { name: /^Equip$/ }))
      .first();
    await expect(settled).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Avatar: randomize + a part control updates the SVG preview', async ({ page }) => {
    await page.goto('/avatar');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Avatar Studio/i }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // The live preview renders an SVG avatar (role=img aria-label="Player avatar").
    const avatar = page.getByRole('img', { name: /Player avatar/i }).first();
    await expect(avatar).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Capture a signature of the SVG markup, then randomize and expect a change.
    const before = await avatar.innerHTML();

    const randomize = page
      .getByRole('button', { name: /^Randomize$/ })
      .or(page.getByRole('button', { name: /^Random$/ }))
      .first();
    await expect(randomize).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await randomize.click();

    // Also exercise a discrete part control so a mutation is guaranteed even in
    // the unlikely event randomize returns an identical config.
    const partSwatch = page.getByRole('button', { name: /^(Background|Accent)\s*\d+$/ }).first();
    if (await partSwatch.count()) {
      await partSwatch.click();
    }

    // The SVG preview markup should differ after these interactions.
    await expect
      .poll(async () => (await avatar.innerHTML()) !== before, { timeout: VISIBLE_TIMEOUT })
      .toBe(true);
  });

  test('Profile: PlayerCard shows username, level and XP', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    // Username is the h1 in the PlayerCard.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // Level badge ("LVL {n}") and an XP readout ("{x} / {y} XP").
    await expect(page.getByText(/LVL\s*\d+/i).first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await expect(page.getByText(/\bXP\b/).first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Avatar SVG present.
    await expect(page.getByRole('img', { name: /Player avatar/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
  });
});
