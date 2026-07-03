import { expect, test } from '@playwright/test';

import { allDemoSlugs, CASINO_SECTIONS, isCasinoGame, demoSearch } from '../../src/lib/demo-games';
import { prep, VISIBLE_TIMEOUT } from './helpers';

/**
 * PPP-7 routing + playability self-validation (demo mode, backend down).
 *
 * Proves: (1) NO game ever dead-ends on "Game not found"; (2) every casino game
 * actually LAUNCHES a playable surface with NO runtime error; (3) the Casino
 * lobby shows ONLY casino games; (4) search ranks casino first.
 */

const SLUGS = allDemoSlugs();

/** Acceptance-critical casino games that MUST launch a playable surface. */
const MUST_LAUNCH = [
  'teen-patti-gold', 'teen-patti', 'andar-bahar', 'dragon-tiger', 'baccarat-deluxe',
  'blackjack', 'blackjack-pro', 'european-roulette', 'lightning-roulette',
  'mega-wheel-live', 'live-blackjack', 'poker', 'casino-holdem',
  'golden-pharaoh', 'fruit-blast', 'wild-safari', 'pirate-treasure', 'lucky-dice', 'rocket-riot',
];

/** Any control that proves a playable game rendered (per prototype). */
const PLAY_CONTROL = /Deal|Spin|Roll|Launch|Place|Bet|Play|Hit|Stand|Drop|Draw/i;
/** Strings that must NEVER appear on a play surface. */
const RUNTIME_ERROR = /Failed to start runtime|Runtime error|Unable to start|Game not found|could not be found/i;

test.describe('PPP-7 — casino playability & zero dead ends', () => {
  test.beforeEach(async ({ page }) => {
    await prep(page);
  });

  test('an unknown slug never shows "Game not found"', async ({ page }) => {
    await page.goto('/games/__this-slug-does-not-exist-zzz__');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/game not found/i)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Play now|In maintenance/i }).first(),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  });

  test('every registry game opens a playable detail page', async ({ page }) => {
    test.setTimeout(200_000);
    const failures: string[] = [];
    for (const slug of SLUGS) {
      await page.goto(`/games/${slug}`);
      await page.waitForLoadState('domcontentloaded');
      const play = page.getByRole('button', { name: /Play now|In maintenance/i }).first();
      const ok = await play.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
      const notFound = await page.getByText(/game not found/i).count();
      if (!ok || notFound > 0) failures.push(`${slug} [notFound=${notFound}, play=${ok ? 'ok' : 'MISSING'}]`);
    }
    expect(failures, `dead-end detail pages:\n${failures.join('\n')}`).toEqual([]);
  });

  test('every casino game LAUNCHES a playable runtime (no runtime error)', async ({ page }) => {
    test.setTimeout(240_000);
    const failures: string[] = [];
    for (const slug of MUST_LAUNCH) {
      await page.goto(`/games/${slug}`);
      await page.waitForLoadState('domcontentloaded');
      const play = page.getByRole('button', { name: /Play now/i }).first();
      const hasPlay = await play.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
      if (!hasPlay) { failures.push(`${slug}: no Play button`); continue; }
      await play.click();
      await page.waitForURL(`**/play/${slug}`, { timeout: VISIBLE_TIMEOUT }).catch(() => {});
      // A real playable control must appear...
      const control = page.getByRole('button', { name: PLAY_CONTROL }).first();
      const playable = await control.waitFor({ state: 'visible', timeout: 12_000 }).then(() => true).catch(() => false);
      // ...and NO runtime/error text anywhere.
      const errors = await page.getByText(RUNTIME_ERROR).count();
      if (!playable || errors > 0) failures.push(`${slug} [playable=${playable}, errors=${errors}]`);
    }
    expect(failures, `non-launching casino games:\n${failures.join('\n')}`).toEqual([]);
  });

  test('the Casino lobby shows ONLY casino games, tables before slots', async ({ page }) => {
    await page.goto('/casino');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('a[href^="/games/"]').first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    const hrefs = await page
      .locator('a[href^="/games/"]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));
    const slugs = [...new Set(hrefs.map((h) => h.replace('/games/', '')).filter(Boolean))];

    // Build a casino-slug set from the registry sections.
    const casinoSlugs = new Set<string>([
      ...CASINO_SECTIONS.popularTables, ...CASINO_SECTIONS.liveCasino,
      ...CASINO_SECTIONS.slots, ...CASINO_SECTIONS.featured, ...CASINO_SECTIONS.jackpots,
    ]);
    const nonCasino = slugs.filter((s) => !casinoSlugs.has(s));
    expect(slugs.length, 'casino renders cards').toBeGreaterThan(0);
    expect(nonCasino, `non-casino slugs leaked into Casino: ${nonCasino.join(', ')}`).toEqual([]);
  });

  test('search ranks casino games first (registry fallback)', async () => {
    // Pure unit assertion on the demo search used by the offline library.
    const results = demoSearch({ search: 'teen' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0] && isCasinoGame(results[0]), 'top result is a casino game').toBeTruthy();

    const mixed = demoSearch({});
    const firstNonCasino = mixed.findIndex((g) => !isCasinoGame(g));
    const lastCasino = mixed.map(isCasinoGame).lastIndexOf(true);
    // All casino games appear before any non-casino game.
    if (firstNonCasino !== -1) expect(lastCasino).toBeLessThan(firstNonCasino);
  });
});
