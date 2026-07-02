/**
 * Deterministic live-activity generator.
 *
 * Produces a reproducible stream of platform "activity" events (wins, jackpots,
 * friends coming online, level-ups, tournament registrations, achievements,
 * purchases, avatar changes) purely as a function of an integer `tick`. No
 * `Date.now()` / `Math.random()` — the same tick always yields the same event,
 * so server and client agree and the stream can advance client-side without
 * hydration drift. Backend-free.
 */

export type ActivityKind =
  | 'win'
  | 'jackpot'
  | 'multiplier'
  | 'friend'
  | 'levelup'
  | 'tournament'
  | 'achievement'
  | 'purchase'
  | 'avatar';

export type ActivityTone = 'good' | 'gold' | 'violet' | 'accent' | 'neutral';

export interface ActivityEvent {
  /** Stable, monotonic key (equal to the source tick). */
  id: number;
  kind: ActivityKind;
  actor: string;
  text: string;
  detail: string;
  tone: ActivityTone;
}

/** FNV-1a hash — deterministic, fast, no external state. */
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
  'Lumen', 'Specter', 'Onyx', 'Cobalt', 'Riptide', 'Solaris', 'Nyx', 'Quasar',
  'Ember', 'Frost', 'Talon', 'Vesper', 'Kairo',
] as const;

const GAMES = [
  'Crash', 'Dice', 'Roulette', 'Blackjack', 'Teen Patti', 'Dragon Tiger', 'Plinko', 'Sports',
] as const;

const TOURNAMENTS = [
  'Weekend Showdown', 'Crash Race', 'High Roller Cup', 'Midnight Masters', 'Rookie Rumble',
] as const;

const ACHIEVEMENTS = [
  'First Blood', 'High Roller', 'On a Streak', 'Legend', 'Sharpshooter', 'Untouchable',
] as const;

const COSMETICS = [
  'Golden Aura', 'Neon Trail', 'Dragon Banner', 'Cyber Frame', 'Prism Skin', 'Void Cloak',
] as const;

/** The relative weight of each kind in the stream. */
const KIND_WEIGHTS: [ActivityKind, number][] = [
  ['win', 7],
  ['multiplier', 4],
  ['jackpot', 2],
  ['friend', 3],
  ['levelup', 3],
  ['tournament', 3],
  ['achievement', 2],
  ['purchase', 2],
  ['avatar', 1],
];

const WEIGHT_TOTAL = KIND_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);

function kindFor(seed: number): ActivityKind {
  let roll = seed % WEIGHT_TOTAL;
  for (const [kind, weight] of KIND_WEIGHTS) {
    if (roll < weight) return kind;
    roll -= weight;
  }
  return 'win';
}

/**
 * The deterministic event for a given tick. Pure: `activityAt(n)` is constant.
 */
export function activityAt(tick: number): ActivityEvent {
  const h = hash(`gp-activity-${tick}`);
  const actor = pick(ACTORS, h);
  const kind = kindFor(h >> 3);
  const game = pick(GAMES, h >> 5);

  switch (kind) {
    case 'jackpot': {
      const amount = 40_000 + (h % 460) * 1000;
      return {
        id: tick,
        kind,
        actor,
        text: `Jackpot on ${game}!`,
        detail: `$${amount.toLocaleString()} · won by ${actor}`,
        tone: 'gold',
      };
    }
    case 'multiplier': {
      const mult = (2 + (h % 480) / 20).toFixed(2);
      const amount = 500 + (h % 90) * 120;
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} hit ${mult}×`,
        detail: `on Crash · cashed out $${amount.toLocaleString()}`,
        tone: 'accent',
      };
    }
    case 'friend': {
      const status = pick(['browsing the lobby', 'joined Crash', 'entered a Dice room', 'is spectating'], h >> 7);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} came online`,
        detail: `now ${status}`,
        tone: 'violet',
      };
    }
    case 'levelup': {
      const level = 5 + (h % 60);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} reached Level ${level}`,
        detail: `${(level * 1250).toLocaleString()} XP milestone`,
        tone: 'accent',
      };
    }
    case 'tournament': {
      const tourney = pick(TOURNAMENTS, h >> 9);
      const players = 32 + (h % 480);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} registered`,
        detail: `${tourney} · ${players} players in`,
        tone: 'violet',
      };
    }
    case 'achievement': {
      const ach = pick(ACHIEVEMENTS, h >> 9);
      const rarity = 3 + (h % 60);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} unlocked "${ach}"`,
        detail: `${rarity}% of players have this`,
        tone: 'gold',
      };
    }
    case 'purchase': {
      const item = pick(COSMETICS, h >> 9);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} bought ${item}`,
        detail: 'trending in the store',
        tone: 'accent',
      };
    }
    case 'avatar': {
      const item = pick(COSMETICS, h >> 11);
      return {
        id: tick,
        kind,
        actor,
        text: `${actor} equipped ${item}`,
        detail: 'new look in the lobby',
        tone: 'neutral',
      };
    }
    case 'win':
    default: {
      const amount = 800 + (h % 300) * 90;
      const mult = (1.2 + (h % 200) / 40).toFixed(2);
      return {
        id: tick,
        kind: 'win',
        actor,
        text: `${actor} won +$${amount.toLocaleString()}`,
        detail: `on ${game} · ${mult}× multiplier`,
        tone: 'good',
      };
    }
  }
}

/** A deterministic seed list of the most recent `count` events (newest first). */
export function seedActivity(count: number): ActivityEvent[] {
  return Array.from({ length: count }, (_, i) => activityAt(count - 1 - i));
}

/**
 * Deterministic "players online" figure that drifts gently around a base so a
 * live counter feels alive without randomness. `phase` advances client-side.
 */
export function playersOnline(base: number, phase: number): number {
  const drift = Math.round(Math.sin(phase / 3) * 140 + Math.sin(phase) * 40);
  return base + drift;
}
