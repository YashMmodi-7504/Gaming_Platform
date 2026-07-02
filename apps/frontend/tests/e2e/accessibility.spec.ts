import { expect, test } from '@playwright/test';

import { accessibilityButton, htmlHasClass, prep, rootFontSize, VISIBLE_TIMEOUT } from './helpers';

/**
 * The floating accessibility control toggles `<html>` classes and root
 * font-size. Note: `prep()` seeds `a11y-reduce=1`, so the "Reduce motion"
 * toggle starts ON and its first click turns motion back ON (removes the
 * class); we assert the toggle *flips* the class either way.
 */
test.describe('Accessibility controls', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('opens the menu and toggles high contrast', async ({ page }) => {
    await accessibilityButton(page).click();

    const highContrast = page.getByRole('switch', { name: /High contrast/i });
    await expect(highContrast).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Starts off → toggling adds `high-contrast` to <html>.
    expect(await htmlHasClass(page, 'high-contrast')).toBe(false);
    await highContrast.click();
    await expect
      .poll(() => htmlHasClass(page, 'high-contrast'), { timeout: VISIBLE_TIMEOUT })
      .toBe(true);

    // Toggle back off.
    await highContrast.click();
    await expect
      .poll(() => htmlHasClass(page, 'high-contrast'), { timeout: VISIBLE_TIMEOUT })
      .toBe(false);
  });

  test('reduce motion toggle flips the reduce-motion class', async ({ page }) => {
    await accessibilityButton(page).click();

    const reduce = page.getByRole('switch', { name: /Reduce motion/i });
    await expect(reduce).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    const initial = await htmlHasClass(page, 'reduce-motion');
    await reduce.click();
    await expect
      .poll(() => htmlHasClass(page, 'reduce-motion'), { timeout: VISIBLE_TIMEOUT })
      .toBe(!initial);
  });

  test('text-size stepper changes the root font-size', async ({ page }) => {
    await accessibilityButton(page).click();

    // Menu is open; the stepper exposes "Smaller text" / "Larger text".
    const larger = page.getByRole('button', { name: /Larger text/i });
    const smaller = page.getByRole('button', { name: /Smaller text/i });
    await expect(larger).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    // Increasing size bumps documentElement.style.fontSize.
    const before = await rootFontSize(page);
    await larger.click();
    await expect.poll(() => rootFontSize(page), { timeout: VISIBLE_TIMEOUT }).not.toBe(before);

    // Decreasing changes it again.
    const mid = await rootFontSize(page);
    await smaller.click();
    await expect.poll(() => rootFontSize(page), { timeout: VISIBLE_TIMEOUT }).not.toBe(mid);
  });
});
