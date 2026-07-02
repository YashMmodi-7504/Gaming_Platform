import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

test.describe('Social surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  test('Friends: online/offline sections and friend rows render', async ({ page }) => {
    await page.goto('/friends');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /^Friends$/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // Online/Offline section headings ("Online — N", "Offline — N").
    await expect(page.getByRole('heading', { name: /Online/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
    await expect(page.getByRole('heading', { name: /Offline/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // Friend rows expose Invite / Spectate actions.
    const rowAction = page
      .getByRole('button', { name: /Invite/i })
      .or(page.getByRole('button', { name: /Spectate/i }));
    await expect(rowAction.first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Leaderboards: podium + ranked list render', async ({ page }) => {
    await page.goto('/leaderboards');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /Leaderboards/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // The full ranking section proves ranked data mounted.
    await expect(page.getByText(/Full ranking/i).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
  });

  test('Community: sections render', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /^Community$/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // A couple of the live sections.
    await expect(page.getByRole('heading', { name: /Top Players/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });
    await expect(
      page.getByRole('heading', { name: /Live & Upcoming Events|Trending Games/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('Clans: roster + chat input appends a message', async ({ page }) => {
    await page.goto('/clans');
    await page.waitForLoadState('domcontentloaded');

    // Roster section.
    await expect(page.getByRole('heading', { name: /Members/i }).first()).toBeVisible({
      timeout: VISIBLE_TIMEOUT,
    });

    // Chat input + submit. Type a unique message and assert it appears.
    const chat = page.getByPlaceholder(/Message your clan/i);
    await expect(chat).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    const msg = `e2e-hello-${Date.now()}`;
    await chat.fill(msg);
    await page.getByRole('button', { name: /^Send$/i }).click();

    await expect(page.getByText(msg).first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });
});
