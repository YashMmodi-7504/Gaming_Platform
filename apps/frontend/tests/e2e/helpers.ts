import { expect, type Page } from '@playwright/test';

/**
 * Shared E2E helpers for the gaming app.
 *
 * The app plays a cinematic intro overlay ONCE per session (~3.4s) that covers
 * the whole screen. To keep tests deterministic and fast, every test must skip
 * it BEFORE the first navigation by seeding sessionStorage. We also enable the
 * `a11y-reduce` flag so animations settle quickly.
 */

/** Generous default for the animated, framer-motion heavy UI. */
export const VISIBLE_TIMEOUT = 15_000;

/**
 * Prime the page so the cinematic intro never shows and motion is calmed.
 * MUST be called before `page.goto(...)` — `addInitScript` runs on every
 * document *before* app code, so the flags are already set on first paint.
 */
export async function prep(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gp-intro-seen', '1');
      localStorage.setItem('a11y-reduce', '1');
      // Phase 1.1: protected routes require auth. Seed a persisted demo session
      // so AuthInitializer restores it and the app treats the page as signed in.
      localStorage.setItem('gp-demo-session', 'guest@player.gg');
      // Phase 1.2: fund the demo wallet so gameplay tests can place bets.
      localStorage.setItem('gp-wallet', JSON.stringify({ state: { balance: 100000 }, version: 0 }));
    } catch {
      /* storage may be unavailable — ignore */
    }
  });
}

/**
 * Sign in via the demo player flow. In demo mode the app accepts any
 * credentials; the dedicated "Continue as Demo Player" button is the most
 * robust path. After sign-in the app navigates to `/` and the header renders
 * the authenticated pills + avatar.
 */
export async function demoLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const demoButton = page.getByRole('button', { name: /Continue as Demo/i });
  await expect(demoButton).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  await demoButton.click();

  // Lands on the dashboard (Phase 1.1). Soft-wait for it to settle — the strict
  // auth assertion lives in auth.spec; here we only need the client session
  // established so downstream page tests run against the authenticated app.
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: VISIBLE_TIMEOUT }).catch(() => {});
  await authIndicator(page)
    .first()
    .waitFor({ state: 'visible', timeout: VISIBLE_TIMEOUT })
    .catch(() => {});
}

/**
 * A locator that is only present when the header is in its authenticated state:
 * the wallet balance chip (Phase 1.2). Unique via its aria-label.
 */
export function authIndicator(page: Page) {
  return page.getByLabel('Wallet balance');
}

/** The floating accessibility toggle (bottom-right, aria-labelled). */
export function accessibilityButton(page: Page) {
  return page.getByRole('button', { name: 'Accessibility options' });
}

/** Read the current root font-size (px) applied by the a11y text-size stepper. */
export async function rootFontSize(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.style.fontSize);
}

/** True when `<html>` carries the given class (e.g. 'high-contrast'). */
export async function htmlHasClass(page: Page, cls: string): Promise<boolean> {
  return page.evaluate((c) => document.documentElement.classList.contains(c), cls);
}

/** Error strings that should never appear on a healthy page. */
export const ERROR_TEXTS = [/Something went wrong/i, /could not be found/i, /404/i, /Application error/i];

/** Assert the page shows no error boundary / not-found text. */
export async function expectNoErrorText(page: Page): Promise<void> {
  for (const re of ERROR_TEXTS) {
    // `count()` is non-fatal; a stray "404" in copy is unlikely on these routes.
    const hits = await page.getByText(re).count();
    expect(hits, `expected no error text matching ${re}`).toBe(0);
  }
}
