/**
 * Deterministic player-presence & identity generators.
 *
 * Pure functions of a string seed (no `Date.now()` / `Math.random()`) so SSR
 * and client agree and everything renders identically without hydration drift.
 * Backend-free. Powers the shared presence components: rich friend presence,
 * first-person activity timelines, and recent-match history.
 */

export type PresenceKind =
  | 'in-lobby'
  | 'playing'
  | 'watching'
  | 'spectating'
  | 'in-store'
  | 'editing-avatar'
  | 'away'
  | 'idle'
  | 'recently-active'
  | 'offline';

export type PresenceTone = 'emerald' | 'accent' | 'violet' | 'gold' | 'pink' | 'muted';

export interface Presence {
  kind: PresenceKind;
  /** Primary status line, e.g. "Playing Crash" or "Last seen 3h ago". */
  label: string;
  /** Optional secondary line, e.g. the game round or tournament name. */
  detail?: string;
  tone: PresenceTone;
  /** Deterministic elapsed-time label, e.g. "12m" or "1h 04m". */
  elapsed: string;
  /** Whether the player is actively online (drives the pulsing dot). */
  active: boolean;
  /** Whether a visual-only join/spectate action makes sense. */
  joinable: boolean;
}

/** FNV-1a — deterministic, dependency-free. */
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

const GAMES = ['Crash', 'Dice', 'Blackjack', 'Roulette', 'Sportsbook'] as const;
const TOURNEYS = ['Weekend Showdown', 'Crash Race', 'High Roller Cup'] as const;

/** Deterministic "Xm" / "Yh ZZm" elapsed label from a seed. */
function elapsedLabel(seed: number): string {
  const mins = seed % 190;
  if (mins < 60) return `${mins + 1}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Rich, deterministic presence for a player seed. Online players resolve to an
 * active status (in a game, spectating, in the store, …); offline players get a
 * "last seen" recency line.
 */
export function presenceFor(seed: string, online: boolean): Presence {
  const h = hash(`presence-${seed}`);
  const elapsed = elapsedLabel(h);

  if (!online) {
    // Offline: either "recently active" or fully offline with a last-seen line.
    const hrs = 1 + (h % 22);
    if (h % 4 === 0) {
      return {
        kind: 'recently-active',
        label: 'Recently active',
        detail: `${elapsed} ago`,
        tone: 'gold',
        elapsed,
        active: false,
        joinable: false,
      };
    }
    return {
      kind: 'offline',
      label: `Last seen ${hrs}h ago`,
      tone: 'muted',
      elapsed: `${hrs}h`,
      active: false,
      joinable: false,
    };
  }

  // Online: weighted spread across the active statuses.
  const roll = h % 20;
  if (roll < 7) {
    const game = pick(GAMES, h >> 4);
    return {
      kind: 'playing',
      label: `Playing ${game}`,
      detail: `${elapsed} in this session`,
      tone: game === 'Sportsbook' ? 'accent' : 'emerald',
      elapsed,
      active: true,
      joinable: true,
    };
  }
  if (roll < 10) {
    return {
      kind: 'in-lobby',
      label: 'In the lobby',
      detail: 'browsing games',
      tone: 'accent',
      elapsed,
      active: true,
      joinable: true,
    };
  }
  if (roll < 13) {
    const t = pick(TOURNEYS, h >> 6);
    return {
      kind: 'watching',
      label: 'Watching tournament',
      detail: t,
      tone: 'violet',
      elapsed,
      active: true,
      joinable: true,
    };
  }
  if (roll < 15) {
    const game = pick(GAMES, h >> 8);
    return {
      kind: 'spectating',
      label: `Spectating ${game}`,
      detail: 'live table',
      tone: 'violet',
      elapsed,
      active: true,
      joinable: true,
    };
  }
  if (roll < 17) {
    return {
      kind: 'in-store',
      label: 'In the store',
      detail: 'browsing cosmetics',
      tone: 'pink',
      elapsed,
      active: true,
      joinable: false,
    };
  }
  if (roll < 18) {
    return {
      kind: 'editing-avatar',
      label: 'Editing avatar',
      detail: 'customising their look',
      tone: 'pink',
      elapsed,
      active: true,
      joinable: false,
    };
  }
  if (roll < 19) {
    return {
      kind: 'away',
      label: 'Away',
      detail: `idle for ${elapsed}`,
      tone: 'gold',
      elapsed,
      active: true,
      joinable: false,
    };
  }
  return {
    kind: 'idle',
    label: 'Idle',
    detail: `${elapsed} inactive`,
    tone: 'muted',
    elapsed,
    active: true,
    joinable: false,
  };
}

/* ------------------------------------------------------------------ */
/* Recent match history                                                */
/* ------------------------------------------------------------------ */

export interface MatchRecord {
  id: number;
  game: (typeof GAMES)[number];
  result: 'win' | 'loss';
  stake: number;
  multiplier: number;
  payout: number;
  ago: string;
}

/** Deterministic recent-match history for a player seed (newest first). */
export function recentMatches(seed: string, count = 6): MatchRecord[] {
  return Array.from({ length: count }, (_, i) => {
    const h = hash(`match-${seed}-${i}`);
    const game = pick(GAMES, h);
    const win = h % 5 !== 0 && i % 3 !== 1; // ~roughly 55% wins, deterministic
    const stake = 50 + (h % 40) * 25;
    const multiplier = win ? 1.2 + (h % 380) / 100 : 0;
    const payout = win ? Math.round(stake * multiplier) : 0;
    const agoMin = i * 17 + (h % 13);
    const ago = agoMin < 60 ? `${agoMin + 1}m ago` : `${Math.floor(agoMin / 60)}h ago`;
    return {
      id: i,
      game,
      result: win ? 'win' : 'loss',
      stake,
      multiplier: Number(multiplier.toFixed(2)),
      payout,
      ago,
    };
  });
}

/* ------------------------------------------------------------------ */
/* First-person activity timeline                                      */
/* ------------------------------------------------------------------ */

export type TimelineKind =
  | 'win'
  | 'achievement'
  | 'levelup'
  | 'purchase'
  | 'equip'
  | 'mission'
  | 'lootbox'
  | 'played';

export interface TimelineEvent {
  id: number;
  kind: TimelineKind;
  text: string;
  detail: string;
  tone: PresenceTone;
  /** 0 = today, 1 = yesterday, … */
  dayOffset: number;
  /** Deterministic HH:MM label. */
  time: string;
}

export interface TimelineDay {
  dayOffset: number;
  label: string;
  events: TimelineEvent[];
}

const ACHIEVEMENTS = ['First Blood', 'High Roller', 'On a Streak', 'Legend', 'Sharpshooter'] as const;
const COSMETICS = ['Golden Aura', 'Neon Trail', 'Dragon Banner', 'Cyber Frame', 'Prism Skin'] as const;
const MISSIONS = ['Daily Grind', 'Win Streak', 'Big Spender', 'Explorer'] as const;

function timelineEvent(seed: string, index: number): TimelineEvent {
  const h = hash(`timeline-${seed}-${index}`);
  const kinds: TimelineKind[] = ['win', 'achievement', 'levelup', 'purchase', 'equip', 'mission', 'lootbox', 'played'];
  const kind = pick(kinds, h);
  const dayOffset = Math.floor(index / 3); // ~3 events per day, newest first
  const time = `${(8 + (h % 14)).toString().padStart(2, '0')}:${(h % 60).toString().padStart(2, '0')}`;

  switch (kind) {
    case 'win': {
      const amount = 800 + (h % 200) * 45;
      return { id: index, kind, text: `Won ${amount.toLocaleString()} coins`, detail: `on ${pick(GAMES, h >> 3)}`, tone: 'emerald', dayOffset, time };
    }
    case 'achievement':
      return { id: index, kind, text: `Unlocked "${pick(ACHIEVEMENTS, h >> 3)}"`, detail: 'achievement earned', tone: 'gold', dayOffset, time };
    case 'levelup':
      return { id: index, kind, text: `Reached Level ${10 + (h % 40)}`, detail: 'level milestone', tone: 'accent', dayOffset, time };
    case 'purchase':
      return { id: index, kind, text: `Purchased ${pick(COSMETICS, h >> 3)}`, detail: 'from the store', tone: 'pink', dayOffset, time };
    case 'equip':
      return { id: index, kind, text: `Equipped ${pick(COSMETICS, h >> 5)}`, detail: 'new look', tone: 'violet', dayOffset, time };
    case 'mission':
      return { id: index, kind, text: `Completed "${pick(MISSIONS, h >> 3)}"`, detail: 'mission complete', tone: 'accent', dayOffset, time };
    case 'lootbox':
      return { id: index, kind, text: 'Opened a Loot Box', detail: `${500 + (h % 50) * 40} coins + a badge`, tone: 'gold', dayOffset, time };
    case 'played':
    default:
      return { id: index, kind: 'played', text: `Played ${pick(GAMES, h >> 3)}`, detail: `${1 + (h % 12)} rounds`, tone: 'muted', dayOffset, time };
  }
}

function dayLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Yesterday';
  return `${offset} days ago`;
}

/** Deterministic first-person timeline grouped by day (newest first). */
export function timelineFor(seed: string, count = 12): TimelineDay[] {
  const events = Array.from({ length: count }, (_, i) => timelineEvent(seed, i));
  const days: TimelineDay[] = [];
  for (const e of events) {
    let day = days.find((d) => d.dayOffset === e.dayOffset);
    if (!day) {
      day = { dayOffset: e.dayOffset, label: dayLabel(e.dayOffset), events: [] };
      days.push(day);
    }
    day.events.push(e);
  }
  return days;
}
