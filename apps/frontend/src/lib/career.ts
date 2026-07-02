/**
 * Deterministic player-career generators (progression / records / journey /
 * collection). Pure functions of a fixed seed + the real cosmetic catalog and
 * profile achievements (no `Date.now()` / `Math.random()`), so SSR and client
 * agree with no hydration drift. Backend-free. Complements `player-presence`,
 * `economy` and the `usePlayerProfile` store.
 */

import { ALL_COSMETICS, type CosmeticCategory, type Rarity } from './cosmetics';
import type { Achievement } from '@/stores/player-profile';

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Career headline stats (deterministic extras beyond the store)       */
/* ------------------------------------------------------------------ */

export interface CareerExtras {
  totalCoinsEarned: number;
  totalGamesPlayed: number;
  totalWins: number;
  biggestWin: number;
  bestStreak: number;
  longestSessionMin: number;
  currentRank: number;
  seasonRank: number;
  highestRank: number;
  firstLoginDaysAgo: number;
  careerCompletion: number;
}

export function careerExtras(seed = 'career'): CareerExtras {
  const h = hash(`career-${seed}`);
  const games = 800 + (h % 40) * 90;
  return {
    totalCoinsEarned: 2_400_000 + (h % 900) * 1000,
    totalGamesPlayed: games,
    totalWins: Math.round(games * (0.42 + (h % 20) / 100)),
    biggestWin: 40_000 + (h % 80) * 900,
    bestStreak: 6 + (h % 14),
    longestSessionMin: 90 + (h % 40) * 6,
    currentRank: 1 + (h % 400),
    seasonRank: 1 + ((h >> 3) % 900),
    highestRank: 1 + ((h >> 6) % 120),
    firstLoginDaysAgo: 120 + (h % 240),
    careerCompletion: 40 + (h % 55),
  };
}

/* ------------------------------------------------------------------ */
/* Personal records                                                    */
/* ------------------------------------------------------------------ */

export interface PersonalRecord {
  id: string;
  label: string;
  game: string;
  value: string;
  icon: string; // lucide name
  tone: string;
  ago: string;
}

const RECORD_SPECS: Array<{ id: string; label: string; game: string; icon: string; tone: string; fmt: (h: number) => string }> = [
  { id: 'crash-mult', label: 'Highest Crash Multiplier', game: 'Crash', icon: 'Rocket', tone: 'text-pink', fmt: (h) => `${(8 + (h % 400) / 10).toFixed(2)}×` },
  { id: 'blackjack', label: 'Best Blackjack Run', game: 'Blackjack', icon: 'Club', tone: 'text-emerald', fmt: (h) => `${3 + (h % 9)} in a row` },
  { id: 'roulette', label: 'Highest Roulette Win', game: 'Roulette', icon: 'CircleDot', tone: 'text-destructive', fmt: (h) => `${(3600 + (h % 90) * 120).toLocaleString('en-US')}` },
  { id: 'dice', label: 'Largest Dice Win', game: 'Dice', icon: 'Dice5', tone: 'text-primary', fmt: (h) => `${(1800 + (h % 80) * 90).toLocaleString('en-US')}` },
  { id: 'coins', label: 'Most Coins Held', game: 'Wallet', icon: 'Coins', tone: 'text-gold', fmt: (h) => `${(180_000 + (h % 90) * 1000).toLocaleString('en-US')}` },
  { id: 'fastest', label: 'Fastest Win', game: 'Crash', icon: 'Timer', tone: 'text-accent', fmt: (h) => `${1 + (h % 4)}.${h % 10}s` },
  { id: 'most-played', label: 'Most Played Game', game: 'Crash', icon: 'Gamepad2', tone: 'text-violet', fmt: (h) => `${240 + (h % 60) * 3} rounds` },
  { id: 'active-day', label: 'Most Active Day', game: 'Platform', icon: 'CalendarDays', tone: 'text-emerald', fmt: (h) => `${40 + (h % 30)} games` },
  { id: 'xp', label: 'Most XP in a Day', game: 'Battle Pass', icon: 'Zap', tone: 'text-accent', fmt: (h) => `${(4000 + (h % 60) * 120).toLocaleString('en-US')} XP` },
];

export function personalRecords(seed = 'career'): PersonalRecord[] {
  return RECORD_SPECS.map((r) => {
    const h = hash(`record-${seed}-${r.id}`);
    const agoDays = 1 + (h % 40);
    return {
      id: r.id,
      label: r.label,
      game: r.game,
      value: r.fmt(h),
      icon: r.icon,
      tone: r.tone,
      ago: agoDays === 1 ? 'yesterday' : `${agoDays}d ago`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Player journey (career milestones)                                  */
/* ------------------------------------------------------------------ */

export interface JourneyMilestone {
  id: string;
  label: string;
  detail: string;
  icon: string;
  tone: string;
  daysAgo: number;
}

export function careerJourney(seed = 'career'): JourneyMilestone[] {
  const specs: Array<Omit<JourneyMilestone, 'daysAgo'> & { base: number }> = [
    { id: 'first-login', label: 'First login', detail: 'Joined the Gaming Universe', icon: 'Sparkles', tone: 'text-accent', base: 240 },
    { id: 'first-win', label: 'First win', detail: 'Won your first round on Crash', icon: 'Rocket', tone: 'text-emerald', base: 236 },
    { id: 'first-tournament', label: 'First tournament', detail: 'Entered Weekend Showdown', icon: 'Trophy', tone: 'text-violet', base: 200 },
    { id: 'level-10', label: 'Reached Level 10', detail: 'Neon Starter milestone', icon: 'TrendingUp', tone: 'text-accent', base: 160 },
    { id: 'first-legendary', label: 'First legendary drop', detail: 'Unlocked a legendary cosmetic', icon: 'Crown', tone: 'text-gold', base: 120 },
    { id: 'best-streak', label: 'Best win streak', detail: 'Won several rounds in a row', icon: 'Flame', tone: 'text-pink', base: 80 },
    { id: 'biggest-jackpot', label: 'Biggest jackpot', detail: 'Hit a five-figure jackpot', icon: 'Gem', tone: 'text-gold', base: 40 },
    { id: 'level-20', label: 'Reached Level 20', detail: 'City Lights milestone', icon: 'Crown', tone: 'text-violet', base: 14 },
  ];
  return specs.map((s) => {
    const h = hash(`journey-${seed}-${s.id}`);
    return { id: s.id, label: s.label, detail: s.detail, icon: s.icon, tone: s.tone, daysAgo: Math.max(1, s.base - (h % 8)) };
  });
}

/* ------------------------------------------------------------------ */
/* Achievement progress by category                                    */
/* ------------------------------------------------------------------ */

export type AchievementCategory =
  | 'Casino' | 'Arcade' | 'Sports' | 'Social' | 'Economy'
  | 'Collection' | 'Events' | 'Season' | 'Competitive' | 'Hidden' | 'Legendary';

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'Casino', 'Arcade', 'Sports', 'Social', 'Economy',
  'Collection', 'Events', 'Season', 'Competitive', 'Hidden', 'Legendary',
];

export interface CategoryProgress {
  category: AchievementCategory;
  total: number;
  unlocked: number;
  pct: number;
}

/**
 * Deterministic per-category achievement progress. Uses the real unlocked count
 * from the profile achievements to anchor the overall ratio, then spreads a
 * plausible seeded distribution across categories.
 */
export function achievementProgress(achievements: Achievement[], seed = 'career'): CategoryProgress[] {
  const unlockedRatio = achievements.length
    ? achievements.filter((a) => a.unlocked).length / achievements.length
    : 0.5;
  return ACHIEVEMENT_CATEGORIES.map((category) => {
    const h = hash(`ach-${seed}-${category}`);
    const total = 6 + (h % 12);
    const unlocked = Math.min(total, Math.round(total * (unlockedRatio * 0.6 + (h % 40) / 100)));
    return { category, total, unlocked, pct: Math.round((unlocked / total) * 100) };
  });
}

export function achievementOverall(achievements: Achievement[], seed = 'career'): { unlocked: number; total: number; pct: number } {
  const per = achievementProgress(achievements, seed);
  const unlocked = per.reduce((s, c) => s + c.unlocked, 0);
  const total = per.reduce((s, c) => s + c.total, 0);
  return { unlocked, total, pct: Math.round((unlocked / total) * 100) };
}

/* ------------------------------------------------------------------ */
/* Collection progress                                                 */
/* ------------------------------------------------------------------ */

const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export interface CategoryCollection {
  category: CosmeticCategory;
  owned: number;
  total: number;
  pct: number;
}

export interface CollectionSummary {
  owned: number;
  total: number;
  pct: number;
  byCategory: CategoryCollection[];
  rarestOwnedId: string | null;
  newestOwnedId: string | null;
}

/** Collection completion computed from the real cosmetic catalog + owned ids. */
export function collectionSummary(owned: string[]): CollectionSummary {
  const ownedSet = new Set(owned);
  const total = ALL_COSMETICS.length;
  const ownedItems = ALL_COSMETICS.filter((c) => ownedSet.has(c.id));

  const categories = [...new Set(ALL_COSMETICS.map((c) => c.category))];
  const byCategory: CategoryCollection[] = categories.map((category) => {
    const all = ALL_COSMETICS.filter((c) => c.category === category);
    const own = all.filter((c) => ownedSet.has(c.id)).length;
    return { category, owned: own, total: all.length, pct: Math.round((own / all.length) * 100) };
  });

  const rarest = [...ownedItems].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || b.price - a.price)[0];
  const newest = ownedItems[ownedItems.length - 1];

  return {
    owned: ownedItems.length,
    total,
    pct: Math.round((ownedItems.length / total) * 100),
    byCategory,
    rarestOwnedId: rarest?.id ?? null,
    newestOwnedId: newest?.id ?? null,
  };
}
