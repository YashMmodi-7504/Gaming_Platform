/**
 * Deterministic live-events engine for the Event Center / Season surfaces.
 *
 * Pure functions of a fixed catalog + seed (no `Date.now()` / `Math.random()`),
 * so SSR and client agree with no hydration drift. Backend-free. Reuses the
 * platform `SEASON` constant and complements `ecosystem-data.liveEvents()`.
 */

import { SEASON } from './ecosystem-data';

export type EventStatus = 'featured' | 'live' | 'upcoming' | 'finished';
export type EventDifficulty = 'Casual' | 'Normal' | 'Hard' | 'Extreme';

export interface PlatformEvent {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide name
  href: string;
  gradient: string;
  reward: string;
  status: EventStatus;
  difficulty: EventDifficulty;
  /** 0–100 platform participation. */
  participation: number;
  /** Live player count. */
  players: number;
  /** 0–100 community progress toward the event goal. */
  progress: number;
  /** Seconds remaining (deterministic seed; ticked client-side). 0 when finished. */
  seconds: number;
  /** For finished events: "3h ago". */
  endedAgo?: string;
}

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

const DIFFICULTY: EventDifficulty[] = ['Casual', 'Normal', 'Hard', 'Extreme'];

interface EventSeed {
  id: string;
  name: string;
  desc: string;
  icon: string;
  href: string;
  gradient: string;
  reward: string;
}

/** The rotating daily-platform-event catalog (deterministic, grounded). */
const CATALOG: EventSeed[] = [
  { id: 'happy-hour', name: 'Happy Hour', desc: 'Double rewards on every win, platform-wide.', icon: 'Sparkles', href: '/casino', gradient: 'from-gold to-warning', reward: '2× rewards' },
  { id: 'double-xp', name: 'Double XP', desc: 'Earn twice the battle-pass XP all session.', icon: 'Zap', href: '/battle-pass', gradient: 'from-accent to-primary', reward: '2× XP' },
  { id: 'crash-frenzy', name: 'Crash Frenzy', desc: 'Boosted multipliers and bonus cash-outs.', icon: 'Rocket', href: '/crash', gradient: 'from-pink to-violet', reward: 'Boosted ×' },
  { id: 'roulette-night', name: 'Roulette Night', desc: 'Hot-number bonus payouts every spin.', icon: 'CircleDot', href: '/roulette', gradient: 'from-destructive to-warning', reward: 'Hot-number bonus' },
  { id: 'blackjack-masters', name: 'Blackjack Masters', desc: 'Perfect-21 hands pay a bonus.', icon: 'Club', href: '/casino', gradient: 'from-emerald to-accent', reward: 'Perfect-21 bonus' },
  { id: 'weekend-festival', name: 'Weekend Festival', desc: 'Festival chests drop across the city.', icon: 'PartyPopper', href: '/world', gradient: 'from-violet via-pink to-gold', reward: 'Festival chests' },
  { id: 'lucky-dice', name: 'Lucky Dice', desc: 'Every triple pays a jackpot.', icon: 'Dice5', href: '/dice', gradient: 'from-emerald to-accent', reward: 'Jackpot triples' },
  { id: 'treasure-hunt', name: 'Treasure Hunt', desc: 'Find hidden loot across districts.', icon: 'Gem', href: '/world', gradient: 'from-gold via-warning to-pink', reward: 'Hidden loot' },
  { id: 'cosmetic-weekend', name: 'Cosmetic Weekend', desc: 'Every cosmetic is 30% off in the store.', icon: 'Palette', href: '/store', gradient: 'from-pink to-violet', reward: '−30% cosmetics' },
  { id: 'marketplace-rush', name: 'Marketplace Rush', desc: 'Reduced fees and trade bonuses.', icon: 'Store', href: '/marketplace', gradient: 'from-accent to-primary', reward: 'Trade bonuses' },
];

function statusFor(index: number, h: number): EventStatus {
  if (index === 0) return 'featured';
  const roll = h % 10;
  if (roll < 4) return 'live';
  if (roll < 8) return 'upcoming';
  return 'finished';
}

function enrich(seed: EventSeed, index: number): PlatformEvent {
  const h = hash(`event-${seed.id}`);
  const status = statusFor(index, h);
  const finished = status === 'finished';
  const seconds = finished ? 0 : status === 'upcoming' ? 1800 + (h % 20) * 3600 : 300 + (h % 90) * 180;
  const agoH = 1 + (h % 20);
  return {
    ...seed,
    status,
    difficulty: pick(DIFFICULTY, h >> 3),
    participation: 30 + (h % 70),
    players: 200 + (h % 88) * 100,
    progress: finished ? 100 : 20 + (h % 78),
    seconds,
    endedAgo: finished ? `${agoH}h ago` : undefined,
  };
}

/** All platform events, deterministically enriched. */
export function platformEvents(): PlatformEvent[] {
  return CATALOG.map(enrich);
}

export function featuredEvent(): PlatformEvent {
  return platformEvents().find((e) => e.status === 'featured') ?? enrich(CATALOG[0]!, 0);
}

export function eventsByStatus(status: EventStatus): PlatformEvent[] {
  return platformEvents().filter((e) => e.status === status);
}

/* ------------------------------------------------------------------ */
/* Community goals                                                     */
/* ------------------------------------------------------------------ */

export interface CommunityGoal {
  id: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  contributors: number;
  tone: string;
}

export function communityGoals(): CommunityGoal[] {
  const specs = [
    { id: 'coins', label: 'Community coin pool', detail: 'Spin the global jackpot', target: 5_000_000, tone: 'from-gold to-warning' },
    { id: 'rounds', label: 'Crash rounds this week', detail: 'Unlock the city fireworks', target: 250_000, tone: 'from-pink to-violet' },
    { id: 'wins', label: 'Wins toward the festival', detail: 'Trigger Weekend Festival', target: 120_000, tone: 'from-accent to-primary' },
  ];
  return specs.map((s) => {
    const h = hash(`goal-${s.id}`);
    return {
      ...s,
      current: Math.round(s.target * (0.45 + (h % 45) / 100)),
      contributors: 1200 + (h % 8000),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Season milestones + stats                                           */
/* ------------------------------------------------------------------ */

export interface SeasonMilestone {
  tier: number;
  label: string;
  reward: string;
  unlocked: boolean;
}

export function seasonMilestones(): SeasonMilestone[] {
  const tiers = [10, 25, 37, 50, 75, 100];
  const labels = ['Neon Starter', 'Rising Glow', 'City Lights', 'Prism Break', 'Aurora Elite', 'Neon Legend'];
  const rewards = ['Neon Frame', '5,000 coins', 'Glow Trail', 'Prism Banner', 'Aurora Title', 'Legendary Bundle'];
  return tiers.map((tier, i) => ({
    tier,
    label: labels[i]!,
    reward: rewards[i]!,
    unlocked: tier <= SEASON.currentTier,
  }));
}

export interface SeasonStats {
  globalCompletion: number;
  playersActive: number;
  rewardsClaimed: number;
  milestonesHit: number;
}

export function seasonStats(): SeasonStats {
  const h = hash(`season-${SEASON.name}`);
  return {
    globalCompletion: Math.round((SEASON.currentTier / SEASON.tiers) * 100),
    playersActive: 40_000 + (h % 60) * 1000,
    rewardsClaimed: 1_200_000 + (h % 800) * 1000,
    milestonesHit: seasonMilestones().filter((m) => m.unlocked).length,
  };
}
