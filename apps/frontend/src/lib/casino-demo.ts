/**
 * Deterministic casino-lobby demo data (jackpots, providers, winners, stats).
 *
 * Pure functions of fixed seeds (no `Date.now()` / `Math.random()`), so SSR and
 * client agree with no hydration drift. Backend-free. Complements
 * `demo-games` (the game catalog) and reuses the shared flag helper.
 */

import { flagFor } from './ecosystem-data';

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length]!;
}

const WINNER_NAMES = [
  'Phoenix', 'NovaQueen', 'GoldRush', 'Vortex', 'Zenith', 'Mirage', 'ApexWolf',
  'Lumen', 'Onyx', 'Cobalt', 'Solaris', 'Quasar', 'Ember', 'Riptide', 'Nyx',
] as const;

const GAME_NAMES = [
  'Neon Rush', 'Golden Pharaoh', 'Rocket Riot', 'Lightning Roulette', 'Fortune Tiger',
  'Sweet Bonanza', 'Crazy Coin Flip', 'Mega Wheel Live', 'Aviator X', 'Gates of Olympus',
] as const;

/* ------------------------------------------------------------------ */
/* Jackpots                                                            */
/* ------------------------------------------------------------------ */

export type JackpotTier = 'Mega' | 'Major' | 'Minor' | 'Mini';

export interface Winner {
  name: string;
  country: string;
  game: string;
  amount: number;
  ago: string;
}

export interface Jackpot {
  tier: JackpotTier;
  value: number;
  tone: string;
  winner: Winner;
}

const TIER_SPEC: { tier: JackpotTier; base: number; tone: string }[] = [
  { tier: 'Mega', base: 4_800_000, tone: 'from-gold via-warning to-pink' },
  { tier: 'Major', base: 640_000, tone: 'from-violet to-pink' },
  { tier: 'Minor', base: 48_000, tone: 'from-accent to-primary' },
  { tier: 'Mini', base: 6_400, tone: 'from-emerald to-accent' },
];

function winnerFor(seed: string): Winner {
  const h = hash(`winner-${seed}`);
  const mins = 1 + (h % 55);
  return {
    name: pick(WINNER_NAMES, h),
    country: flagFor(`${seed}c`),
    game: pick(GAME_NAMES, h >> 4),
    amount: 1_000 + (h % 900) * 100,
    ago: `${mins}m ago`,
  };
}

export function jackpots(): Jackpot[] {
  return TIER_SPEC.map((t) => {
    const h = hash(`jackpot-${t.tier}`);
    return {
      tier: t.tier,
      value: t.base + (h % 90) * 137,
      tone: t.tone,
      winner: winnerFor(t.tier),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Providers                                                          */
/* ------------------------------------------------------------------ */

export interface Provider {
  code: string;
  name: string;
  games: number;
  popularity: number;
  featured: string;
  gradient: string;
}

const PROVIDER_NAMES = [
  'Evolution', 'Pragmatic', 'BGaming', 'Hacksaw', 'NetEnt',
  "Play'n GO", 'Red Tiger', 'NoLimit City', 'Relax Gaming', 'Push Gaming',
] as const;

const PROVIDER_GRADIENTS = [
  'from-primary to-violet', 'from-accent to-primary', 'from-gold to-warning',
  'from-emerald to-accent', 'from-pink to-violet', 'from-violet to-primary',
  'from-destructive to-warning', 'from-primary to-emerald', 'from-accent to-pink', 'from-gold to-pink',
];

export function providers(): Provider[] {
  return PROVIDER_NAMES.map((name, i) => {
    const h = hash(`provider-${name}`);
    return {
      code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      games: 40 + (h % 320),
      popularity: 60 + (h % 40),
      featured: pick(GAME_NAMES, h),
      gradient: pick(PROVIDER_GRADIENTS, i),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Lobby stats + winners                                              */
/* ------------------------------------------------------------------ */

export interface CasinoStats {
  playersOnline: number;
  liveTables: number;
  winnersToday: number;
  dailyJackpot: number;
}

export function casinoStats(): CasinoStats {
  const h = hash('casino-stats');
  return {
    playersOnline: 18_000 + (h % 60) * 100,
    liveTables: 60 + (h % 40),
    winnersToday: 8_000 + (h % 40) * 100,
    dailyJackpot: 2_400_000 + (h % 800) * 137,
  };
}

/** Recent winners ticker for the hero. */
export function recentWinners(count = 6): Winner[] {
  return Array.from({ length: count }, (_, i) => {
    const w = winnerFor(`recent-${i}`);
    return { ...w, amount: 2_000 + (hash(`rw-${i}`) % 480) * 100 };
  });
}
