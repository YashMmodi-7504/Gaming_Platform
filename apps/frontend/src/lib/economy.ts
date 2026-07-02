/**
 * Deterministic economy generators for the Store / Marketplace / Wallet surfaces.
 *
 * Pure functions of a string seed (no `Date.now()` / `Math.random()`) so SSR and
 * client agree with no hydration drift. Backend-free. Grounded in the real
 * cosmetic catalog (`ALL_COSMETICS`) so events reference actual item names, and
 * complementary to `live-activity` (platform feed) and `player-presence`.
 */

import { ALL_COSMETICS, type Cosmetic, type Rarity } from './cosmetics';

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

const ACTORS = [
  'Phoenix', 'NovaQueen', 'Vortex', 'GoldRush', 'Zenith', 'Mirage', 'ApexWolf',
  'Lumen', 'Specter', 'Onyx', 'Cobalt', 'Riptide', 'Solaris', 'Quasar', 'Ember',
] as const;

/** Priced, non-starter cosmetics — the tradeable/sellable pool. */
const TRADEABLE: Cosmetic[] = ALL_COSMETICS.filter((c) => c.price > 0);

function cosmeticAt(seed: number): Cosmetic {
  return pick(TRADEABLE, seed);
}

/* ------------------------------------------------------------------ */
/* Live economy events                                                 */
/* ------------------------------------------------------------------ */

export type EconomyEventKind = 'purchase' | 'equip' | 'sold' | 'bundle' | 'trade';

export interface EconomyEvent {
  id: number;
  kind: EconomyEventKind;
  actor: string;
  item: string;
  rarity: Rarity;
  text: string;
  detail: string;
}

/** Deterministic economy event for a tick (newest-first when seeded downward). */
export function economyEventAt(tick: number): EconomyEvent {
  const h = hash(`economy-${tick}`);
  const actor = pick(ACTORS, h);
  const cosmetic = cosmeticAt(h >> 3);
  const kind = pick<EconomyEventKind>(['purchase', 'equip', 'sold', 'bundle', 'trade'], h >> 6);
  const price = cosmetic.price + (h % 40) * 25;

  const base = { id: tick, actor, item: cosmetic.name, rarity: cosmetic.rarity };
  switch (kind) {
    case 'equip':
      return { ...base, kind, text: `${actor} equipped ${cosmetic.name}`, detail: `${cosmetic.rarity} ${cosmetic.category}` };
    case 'sold':
      return { ...base, kind, text: `${cosmetic.rarity} ${cosmetic.name} sold`, detail: `${price.toLocaleString()} coins` };
    case 'bundle':
      return { ...base, kind, text: `${actor} bought a bundle`, detail: `${cosmetic.name} + 2 items` };
    case 'trade':
      return { ...base, kind, text: `Trade completed`, detail: `${cosmetic.name} · ${price.toLocaleString()} coins` };
    case 'purchase':
    default:
      return { ...base, kind: 'purchase', text: `${actor} purchased ${cosmetic.name}`, detail: `${price.toLocaleString()} coins` };
  }
}

/** A deterministic seed list of recent economy events (newest first). */
export function economyEvents(count: number): EconomyEvent[] {
  return Array.from({ length: count }, (_, i) => economyEventAt(count - 1 - i));
}

/* ------------------------------------------------------------------ */
/* Marketplace: trades, price history, supply/demand                   */
/* ------------------------------------------------------------------ */

export interface Trade {
  id: number;
  buyer: string;
  seller: string;
  item: string;
  rarity: Rarity;
  price: number;
  ago: string;
}

/** Deterministic recent trades for a marketplace seed (newest first). */
export function marketTrades(seed: string, count = 8): Trade[] {
  return Array.from({ length: count }, (_, i) => {
    const h = hash(`trade-${seed}-${i}`);
    const cosmetic = cosmeticAt(h);
    const agoMin = i * 6 + (h % 5);
    return {
      id: i,
      buyer: pick(ACTORS, h),
      seller: pick(ACTORS, h >> 5),
      item: cosmetic.name,
      rarity: cosmetic.rarity,
      price: cosmetic.price + (h % 30) * 50,
      ago: agoMin < 60 ? `${agoMin + 1}m ago` : `${Math.floor(agoMin / 60)}h ago`,
    };
  });
}

/** Deterministic price series (oldest → newest) for a sparkline. */
export function priceHistory(seed: string, points = 16, base = 1000): number[] {
  let value = base;
  const h0 = hash(`price-${seed}`);
  return Array.from({ length: points }, (_, i) => {
    const h = hash(`price-${seed}-${i}`) ^ h0;
    const swing = ((h % 21) - 10) / 100; // ±10%
    value = Math.max(base * 0.4, Math.round(value * (1 + swing)));
    return value;
  });
}

export interface SupplyDemand {
  supply: number;
  demand: number;
  /** 0–100 popularity. */
  popularity: number;
  /** Signed % price movement over the period. */
  movementPct: number;
}

export function supplyDemand(seed: string): SupplyDemand {
  const h = hash(`sd-${seed}`);
  const series = priceHistory(seed, 16, 1000);
  const first = series[0]!;
  const last = series[series.length - 1]!;
  return {
    supply: 20 + (h % 480),
    demand: 20 + ((h >> 5) % 620),
    popularity: 30 + (h % 70),
    movementPct: Number((((last - first) / first) * 100).toFixed(1)),
  };
}

/* ------------------------------------------------------------------ */
/* Wallet insights + economy dashboard                                 */
/* ------------------------------------------------------------------ */

export interface CoinSource {
  label: string;
  pct: number;
  tone: string;
}

export interface WalletInsights {
  earnedToday: number;
  earnedWeek: number;
  earnedMonth: number;
  spent: number;
  largestWin: number;
  largestReward: number;
  avgPurchase: number;
  sources: CoinSource[];
  recentRewards: Array<{ label: string; amount: number }>;
  recentPurchases: Array<{ item: string; rarity: Rarity; amount: number }>;
}

/** Deterministic wallet insights (stable per seed — demo-visible, backend-free). */
export function walletInsights(seed = 'wallet'): WalletInsights {
  const h = hash(`insights-${seed}`);
  const earnedToday = 4000 + (h % 60) * 180;
  const rewards = [
    { label: 'Daily reward', amount: 5000 + (h % 20) * 250 },
    { label: 'Tournament payout', amount: 12000 + ((h >> 3) % 40) * 400 },
    { label: 'Mission complete', amount: 1500 + ((h >> 5) % 20) * 120 },
    { label: 'Loot box', amount: 2500 + ((h >> 7) % 15) * 200 },
  ];
  const purchases = Array.from({ length: 4 }, (_, i) => {
    const c = cosmeticAt(hash(`wp-${seed}-${i}`));
    return { item: c.name, rarity: c.rarity, amount: c.price };
  });
  return {
    earnedToday,
    earnedWeek: earnedToday * 6 + (h % 8000),
    earnedMonth: earnedToday * 24 + (h % 40000),
    spent: 3000 + (h % 40) * 220,
    largestWin: 30_000 + (h % 70) * 900,
    largestReward: 12_000 + ((h >> 4) % 40) * 500,
    avgPurchase: 6000 + (h % 20) * 300,
    sources: [
      { label: 'Game wins', pct: 46, tone: 'bg-emerald' },
      { label: 'Rewards', pct: 24, tone: 'bg-gold' },
      { label: 'Tournaments', pct: 18, tone: 'bg-violet' },
      { label: 'Bonuses', pct: 12, tone: 'bg-accent' },
    ],
    recentRewards: rewards,
    recentPurchases: purchases,
  };
}

export interface EconomyStats {
  coinsEarnedToday: number;
  coinsSpent: number;
  avgPurchase: number;
  mostPopular: Cosmetic;
  mostEquipped: Cosmetic;
  trendingBundle: string;
  seasonEconomy: number;
  mostActiveCategory: string;
  communityDemand: number;
}

/** Deterministic platform economy snapshot for the economy dashboard. */
export function economyStats(seed = 'economy'): EconomyStats {
  const h = hash(`stats-${seed}`);
  const legendary = TRADEABLE.filter((c) => c.rarity === 'legendary');
  const epic = TRADEABLE.filter((c) => c.rarity === 'epic');
  return {
    coinsEarnedToday: 1_200_000 + (h % 800) * 1000,
    coinsSpent: 840_000 + ((h >> 3) % 600) * 1000,
    avgPurchase: 7200 + (h % 30) * 200,
    mostPopular: pick(epic.length ? epic : TRADEABLE, h),
    mostEquipped: pick(legendary.length ? legendary : TRADEABLE, h >> 4),
    trendingBundle: `${pick(TRADEABLE, h >> 6).name} Bundle`,
    seasonEconomy: 60 + (h % 40),
    mostActiveCategory: pick(['Frames', 'Themes', 'Titles', 'Banners'], h >> 8),
    communityDemand: 55 + (h % 45),
  };
}
