/**
 * Deterministic demo game catalog.
 *
 * Produces valid `GameSummary[]` purely from a seed (no `Date.now()` /
 * `Math.random()`), so pages are never empty when the backend isn't reachable
 * (demo mode) and SSR/client agree with no hydration drift. Thumbnails are left
 * null on purpose so the existing `GameCover` generates premium cover art.
 * Backend-free; original game/provider names (not copied from real brands).
 */

import type { GameSummary } from '@gaming-platform/types';

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

const PROVIDERS = [
  { code: 'nova', name: 'Nova Gaming' },
  { code: 'prism', name: 'Prism Studios' },
  { code: 'aurora', name: 'Aurora Play' },
  { code: 'zenith', name: 'Zenith Labs' },
  { code: 'lumen', name: 'Lumen Interactive' },
  { code: 'vortex', name: 'Vortex Games' },
  { code: 'quantum', name: 'Quantum Arcade' },
  { code: 'orbit', name: 'Orbit Originals' },
] as const;

interface Seed {
  name: string;
  category: { slug: string; name: string };
  tags: string[];
}

const CAT = {
  slots: { slug: 'slots', name: 'Slots' },
  crash: { slug: 'crash', name: 'Crash' },
  dice: { slug: 'dice', name: 'Dice' },
  roulette: { slug: 'roulette', name: 'Roulette' },
  cards: { slug: 'cards', name: 'Card Games' },
  live: { slug: 'live', name: 'Live Dealer' },
  arcade: { slug: 'arcade', name: 'Arcade' },
  instant: { slug: 'instant', name: 'Instant Win' },
  sports: { slug: 'sports', name: 'Sports' },
} as const;

/** Original, on-theme catalog — enough variety to fill every shelf. */
const CATALOG: Seed[] = [
  { name: 'Neon Rush', category: CAT.slots, tags: ['neon', 'megaways'] },
  { name: 'Golden Pharaoh', category: CAT.slots, tags: ['egypt', 'jackpot'] },
  { name: 'Cosmic Fortune', category: CAT.slots, tags: ['space', 'bonus'] },
  { name: 'Dragon Gold', category: CAT.slots, tags: ['dragon', 'asia'] },
  { name: 'Fruit Blast', category: CAT.slots, tags: ['classic', 'fruit'] },
  { name: 'Pirate Treasure', category: CAT.slots, tags: ['pirate', 'adventure'] },
  { name: 'Wild Safari', category: CAT.slots, tags: ['animals', 'wild'] },
  { name: 'Crystal Caverns', category: CAT.slots, tags: ['gems', 'cascade'] },
  { name: 'Rocket Riot', category: CAT.crash, tags: ['crash', 'multiplier'] },
  { name: 'Skyfall Crash', category: CAT.crash, tags: ['crash', 'fast'] },
  { name: 'Moon Launch', category: CAT.crash, tags: ['crash', 'space'] },
  { name: 'Turbo Ascent', category: CAT.crash, tags: ['crash', 'turbo'] },
  { name: 'Lucky Dice', category: CAT.dice, tags: ['dice', 'classic'] },
  { name: 'Sic Bo Royale', category: CAT.dice, tags: ['dice', 'asia'] },
  { name: 'Triple Sevens', category: CAT.dice, tags: ['dice', 'lucky'] },
  { name: 'European Roulette', category: CAT.roulette, tags: ['roulette', 'classic'] },
  { name: 'Lightning Roulette', category: CAT.roulette, tags: ['roulette', 'live'] },
  { name: 'VIP Roulette', category: CAT.roulette, tags: ['roulette', 'vip'] },
  { name: 'Teen Patti Gold', category: CAT.cards, tags: ['cards', 'india'] },
  { name: 'Dragon Tiger', category: CAT.cards, tags: ['cards', 'live'] },
  { name: 'Blackjack Pro', category: CAT.cards, tags: ['cards', 'blackjack'] },
  { name: 'Baccarat Deluxe', category: CAT.cards, tags: ['cards', 'baccarat'] },
  { name: 'Andar Bahar', category: CAT.cards, tags: ['cards', 'india'] },
  { name: 'Live Casino Hold’em', category: CAT.live, tags: ['live', 'poker'] },
  { name: 'Speed Baccarat Live', category: CAT.live, tags: ['live', 'fast'] },
  { name: 'Mega Wheel Live', category: CAT.live, tags: ['live', 'wheel'] },
  { name: 'Crazy Coin Flip', category: CAT.live, tags: ['live', 'bonus'] },
  { name: 'Neon Breaker', category: CAT.arcade, tags: ['arcade', 'retro'] },
  { name: 'Pixel Dash', category: CAT.arcade, tags: ['arcade', 'runner'] },
  { name: 'Block Stack', category: CAT.arcade, tags: ['arcade', 'puzzle'] },
  { name: 'Color Match', category: CAT.arcade, tags: ['arcade', 'casual'] },
  { name: 'Memory Grid', category: CAT.arcade, tags: ['arcade', 'brain'] },
  { name: 'Reaction Rush', category: CAT.arcade, tags: ['arcade', 'reflex'] },
  { name: 'Plinko Drop', category: CAT.instant, tags: ['instant', 'plinko'] },
  { name: 'Mines Master', category: CAT.instant, tags: ['instant', 'mines'] },
  { name: 'Keno Nights', category: CAT.instant, tags: ['instant', 'keno'] },
  { name: 'Scratch Gold', category: CAT.instant, tags: ['instant', 'scratch'] },
  { name: 'Penalty Shootout', category: CAT.sports, tags: ['sports', 'football'] },
  { name: 'Derby Sprint', category: CAT.sports, tags: ['sports', 'racing'] },
  { name: 'Slam Dunk Arena', category: CAT.sports, tags: ['sports', 'basketball'] },
  { name: 'Aviator X', category: CAT.crash, tags: ['crash', 'aviator'] },
  { name: 'Fortune Tiger', category: CAT.slots, tags: ['tiger', 'jackpot'] },
  { name: 'Sweet Bonanza', category: CAT.slots, tags: ['candy', 'tumble'] },
  { name: 'Gates of Olympus', category: CAT.slots, tags: ['greek', 'multiplier'] },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Build one deterministic GameSummary for a catalog entry + seed. */
function toSummary(seed: Seed, index: number, key: string): GameSummary {
  const h = hash(`demo-${key}-${seed.name}`);
  const provider = pick(PROVIDERS, h);
  const ratingCount = 40 + (h % 4000);
  return {
    id: `demo-${slugify(seed.name)}`,
    slug: slugify(seed.name),
    name: seed.name,
    thumbnailUrl: null,
    bannerUrl: null,
    category: seed.category,
    provider: { code: provider.code, name: provider.name },
    tags: seed.tags,
    ageRating: '18+',
    status: 'published',
    visibility: 'public',
    isNew: h % 5 === 0,
    isFeatured: h % 7 === 0,
    isTrending: h % 4 === 0,
    maintenanceMode: false,
    ratingAverage: Number((3.9 + (h % 110) / 100).toFixed(1)),
    ratingCount,
    popularityScore: 1000 - index * 7 + (h % 300),
    rtp: Number((95 + (h % 400) / 100).toFixed(2)),
  };
}

/** A deterministic slice of the catalog, rotated by seed. */
export function demoGames(key: string, count = 12): GameSummary[] {
  const start = hash(key) % CATALOG.length;
  return Array.from({ length: Math.min(count, CATALOG.length) }, (_, i) => {
    const entry = pick(CATALOG, start + i);
    return toSummary(entry, i, key);
  });
}

/** Deterministic games filtered to a category (falls back to the full pool). */
export function demoGamesByCategory(categorySlug: string, count = 12): GameSummary[] {
  const matches = CATALOG.filter((c) => c.category.slug === categorySlug);
  const pool = matches.length >= 4 ? matches : CATALOG;
  const start = hash(`cat-${categorySlug}`) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => {
    const entry = pick(pool, start + i);
    return toSummary(entry, i, `cat-${categorySlug}`);
  });
}
