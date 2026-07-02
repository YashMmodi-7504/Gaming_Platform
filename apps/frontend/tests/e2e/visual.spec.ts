import { expect, test } from '@playwright/test';

import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';

/**
 * Visual regression across three viewports for the most representative,
 * layout-heavy routes. Baselines are generated on the first run
 * (`--update-snapshots`).
 *
 * The app is animation-rich, so we:
 *  - rely on `prep()`'s `a11y-reduce=1` to calm motion,
 *  - mask the floating Nova / sound / accessibility buttons and live-number
 *    pills (which tick independently),
 *  - allow a small `maxDiffPixelRatio` for residual animation jitter.
 */
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

const ROUTES = ['/', '/world', '/store'] as const;

test.describe('Visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
    await demoLogin(page);
  });

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');

        // Ensure primary content painted before snapshotting.
        await expect(page.locator('main, header').first()).toBeVisible({
          timeout: VISIBLE_TIMEOUT,
        });

        // Mask floating widgets and independently-animating live numbers.
        const masks = [
          page.getByRole('button', { name: 'Accessibility options' }),
          page.getByRole('button', { name: /Nova|assistant|sound|mute/i }),
          page.getByRole('button', { name: /Reload demo coins/i }),
          page.locator('.tabular-nums'),
        ];

        const slug = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
        await expect(page).toHaveScreenshot(`${slug}-${vp.name}.png`, {
          fullPage: false,
          maxDiffPixelRatio: 0.03,
          animations: 'disabled',
          mask: masks,
        });
      });
    }
  }
});
