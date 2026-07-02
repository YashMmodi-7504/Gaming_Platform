/**
 * Deterministic demo data for the Leaderboards page.
 *
 * Used purely as a presentation fallback when the real leaderboard query
 * returns nothing — the page must never render empty. Everything here is
 * seeded by index, so the output is stable across renders/SSR (no
 * `Date.now()` / `Math.random()` at module scope).
 */

export type LeaderboardCategoryId =
  | 'top-winners'
  | 'todays-winners'
  | 'weekly-winners'
  | 'biggest-wins'
  | 'highest-multipliers'
  | 'tournament-winners'
  | 'vip-rankings';

export interface LeaderboardCategory {
  id: LeaderboardCategoryId;
  name: string;
  /** Short tagline shown under the active category. */
  tagline: string;
  /** How the primary stat should be read. */
  metric: 'winnings' | 'score' | 'multiplier';
}

export type VipTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface PlayerRow {
  rank: number;
  name: string;
  /** Flag emoji for the player's country. */
  country: string;
  /** Stable seed used to derive the avatar gradient + initials. */
  avatarSeed: string;
  /** Display initials derived from the name. */
  initials: string;
  /** Primary numeric value for the active category. */
  value: number;
  /** Game the player is best known for in this board. */
  game: string;
  /** Peak multiplier (x). */
  multiplier: number;
  vipTier: VipTier;
  /** Rank movement vs. previous period: positive = up, negative = down, 0 = steady. */
  delta: number;
}

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  { id: 'top-winners', name: 'Top Winners', tagline: 'All-time biggest earners on the platform.', metric: 'winnings' },
  { id: 'todays-winners', name: "Today's Winners", tagline: 'Hot streaks from the last 24 hours.', metric: 'winnings' },
  { id: 'weekly-winners', name: 'Weekly Winners', tagline: 'This week’s sharpest performers.', metric: 'winnings' },
  { id: 'biggest-wins', name: 'Biggest Wins', tagline: 'Single-round jackpots that broke the bank.', metric: 'winnings' },
  { id: 'highest-multipliers', name: 'Highest Multipliers', tagline: 'Insane multiplier hits, ranked.', metric: 'multiplier' },
  { id: 'tournament-winners', name: 'Tournament Winners', tagline: 'Champions of the arena bracket.', metric: 'score' },
  { id: 'vip-rankings', name: 'VIP Rankings', tagline: 'Loyalty points across our elite club.', metric: 'score' },
];

/* -------------------------------------------------------------------------- */
/* Seed pools                                                                 */
/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  'Lucas', 'Aiko', 'Mateo', 'Priya', 'Noah', 'Sofia', 'Liam', 'Yuki', 'Diego', 'Amara',
  'Elena', 'Kenji', 'Olivia', 'Rohan', 'Mia', 'Hugo', 'Zara', 'Felix', 'Nadia', 'Marco',
  'Isla', 'Tariq', 'Lena', 'Ravi', 'Chloe', 'Bruno', 'Anya', 'Theo', 'Maya', 'Ivan',
  'Selene', 'Cole', 'Freya', 'Omar', 'Vera', 'Niko', 'Ingrid', 'Pablo', 'Suki', 'Dario',
];

const LAST_NAMES = [
  'Silva', 'Tanaka', 'Reyes', 'Sharma', 'Becker', 'Rossi', 'Novak', 'Andersen', 'Costa', 'Okoro',
  'Petrov', 'Lindqvist', 'Mendez', 'Khan', 'Vargas', 'Moreau', 'Yamada', 'Schmidt', 'Bianchi', 'Adeyemi',
  'Nilsson', 'Haddad', 'Romano', 'Patel', 'Dubois', 'Garcia', 'Kovac', 'Larsen', 'Ferraro', 'Volkov',
];

const COUNTRIES = ['🇧🇷', '🇮🇳', '🇬🇧', '🇩🇪', '🇺🇸', '🇯🇵', '🇪🇸', '🇫🇷', '🇮🇹', '🇸🇪', '🇳🇬', '🇷🇺', '🇲🇽', '🇰🇷', '🇨🇦', '🇦🇺'];

const GAMES = ['Aviator', 'Mega Roulette', 'Crash X', 'Blackjack Pro', 'Lucky Dice', 'Gates of Olympus', 'Plinko', 'Mines', 'Hi-Lo', 'Wheel of Fate'];

const VIP_TIERS: VipTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

/* -------------------------------------------------------------------------- */
/* Deterministic helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Small integer hash so a string + offset deterministically picks a pool index. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(pool: readonly T[], n: number): T {
  // Guard the index access (repo uses noUncheckedIndexedAccess).
  const idx = pool.length > 0 ? n % pool.length : 0;
  return pool[idx] as T;
}

function makeName(i: number): string {
  const first = pick(FIRST_NAMES, i * 3 + 1);
  const last = pick(LAST_NAMES, i * 7 + 2);
  return `${first} ${last}`;
}

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const a = parts[0]?.[0] ?? 'X';
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return (a + b).toUpperCase();
}

/**
 * Eight pleasant LIGHT-theme gradient pairs (Tailwind classes) for avatars.
 * Chosen deterministically from the avatar seed.
 */
export const AVATAR_GRADIENTS = [
  'from-primary to-accent',
  'from-accent to-emerald',
  'from-pink to-primary',
  'from-gold to-warning',
  'from-emerald to-primary',
  'from-violet to-pink',
  'from-warning to-pink',
  'from-primary to-violet',
] as const;

export function avatarGradient(seed: string): string {
  return pick(AVATAR_GRADIENTS, hash(seed));
}

/* -------------------------------------------------------------------------- */
/* Row + category generation                                                  */
/* -------------------------------------------------------------------------- */

interface CategoryShape {
  /** Top value for rank #1. */
  base: number;
  /** How much each lower rank drops (multiplicative, deterministic). */
  decay: number;
  metric: LeaderboardCategory['metric'];
}

const CATEGORY_SHAPE: Record<LeaderboardCategoryId, CategoryShape> = {
  'top-winners': { base: 4_280_000, decay: 0.86, metric: 'winnings' },
  'todays-winners': { base: 184_500, decay: 0.83, metric: 'winnings' },
  'weekly-winners': { base: 962_400, decay: 0.85, metric: 'winnings' },
  'biggest-wins': { base: 1_540_000, decay: 0.8, metric: 'winnings' },
  'highest-multipliers': { base: 9_840, decay: 0.82, metric: 'multiplier' },
  'tournament-winners': { base: 148_600, decay: 0.88, metric: 'score' },
  'vip-rankings': { base: 2_960_000, decay: 0.9, metric: 'score' },
};

function buildRow(category: LeaderboardCategoryId, i: number): PlayerRow {
  const shape = CATEGORY_SHAPE[category];
  // Salt the per-category index so each board has different people/order.
  const salt = hash(category) % 13;
  const idx = i + salt;

  const name = makeName(idx);
  const seed = `${category}-${idx}-${name}`;
  const h = hash(seed);

  // Deterministic "jitter" in [0.92, 1.0] so values aren't a clean curve.
  const jitter = 0.92 + ((h % 80) / 1000);
  const raw = shape.base * Math.pow(shape.decay, i) * jitter;

  const value =
    shape.metric === 'multiplier'
      ? Math.round(raw * 100) / 100
      : Math.round(raw / 10) * 10;

  // Multiplier shown on every row (peak hit), independent of the metric.
  const multiplier =
    shape.metric === 'multiplier'
      ? value
      : Math.round((1.8 + (h % 4200) / 100) * 100) / 100;

  // VIP tier weighted toward the top of the board.
  const tierIndex = i < 3 ? 4 - (i % 2) : Math.max(0, 4 - Math.floor(i / 4) - (h % 2));
  const vipTier = pick(VIP_TIERS, tierIndex);

  // Rank movement: steady-ish near the top, livelier further down.
  const deltaRaw = (h % 7) - 3; // -3..3
  const delta = i === 0 ? Math.max(0, deltaRaw) : deltaRaw;

  return {
    rank: i + 1,
    name,
    country: pick(COUNTRIES, h),
    avatarSeed: seed,
    initials: initialsOf(name),
    value,
    game: pick(GAMES, h + idx),
    multiplier,
    vipTier,
    delta,
  };
}

/** Deterministically generate a full board for a category. */
export function generateLeaderboard(category: LeaderboardCategoryId, count = 24): PlayerRow[] {
  return Array.from({ length: count }, (_, i) => buildRow(category, i));
}

/** Total value across a board — used for the "paid out" headline stat. */
export function totalValue(rows: PlayerRow[]): number {
  return rows.reduce((sum, r) => sum + r.value, 0);
}

/** Headline figure: total demo winnings paid out across the platform. */
export const TOTAL_PAID_OUT = 48_920_000;

/** Headline figure: total ranked players. */
export const PLAYERS_RANKED = 184_320;
