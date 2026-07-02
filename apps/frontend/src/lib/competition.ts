/**
 * Deterministic competitive-identity generators for the tournament experience.
 *
 * Pure functions of a string seed (participant id / tournament id) — no
 * `Date.now()` / `Math.random()` — so SSR and client agree with no hydration
 * drift. Backend-free. Complements `player-presence` (presence) and reuses the
 * shared flag helper from `ecosystem-data`.
 */

const GAMES = ['Crash', 'Dice', 'Blackjack', 'Roulette', 'Sportsbook', 'Teen Patti'] as const;

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

export interface CompetitorStats {
  rank: number;
  level: number;
  /** 0–100. */
  winRate: number;
  streak: number;
  favoriteGame: (typeof GAMES)[number];
  achievements: number;
  online: boolean;
  /** 0–100 head-to-head prediction share. */
  prediction: number;
}

/** Deterministic competitive stats for a participant seed. */
export function competitorStats(seed: string, rankHint?: number): CompetitorStats {
  const h = hash(`competitor-${seed}`);
  return {
    rank: rankHint ?? 1 + (h % 200),
    level: 10 + (h % 90),
    winRate: 42 + (h % 53),
    streak: h % 12,
    favoriteGame: pick(GAMES, h >> 4),
    achievements: 4 + (h % 46),
    online: h % 4 !== 0,
    prediction: 30 + (h % 41),
  };
}

/* ------------------------------------------------------------------ */
/* Spectator / viewer counts                                           */
/* ------------------------------------------------------------------ */

/** Deterministic live-viewer count that drifts gently with `phase`. */
export function viewerCount(seed: string, phase = 0): number {
  const base = 800 + (hash(`viewers-${seed}`) % 9200);
  const drift = Math.round(Math.sin(phase / 2) * 60 + Math.sin(phase) * 18);
  return Math.max(0, base + drift);
}

/* ------------------------------------------------------------------ */
/* Tournament timeline (competition phases)                            */
/* ------------------------------------------------------------------ */

export type PhaseState = 'done' | 'current' | 'upcoming';

export interface TournamentPhase {
  id: string;
  label: string;
  detail: string;
  state: PhaseState;
}

/**
 * The competition phase timeline, with each phase resolved to done / current /
 * upcoming from the tournament's status. Deterministic and ordered.
 */
export function tournamentPhases(status: string, rounds = 4): TournamentPhase[] {
  const s = status.toLowerCase();
  const registrationDone = s !== 'scheduled' && s !== 'draft';
  const live = s === 'live' || s === 'active' || s === 'running';
  const completed = s === 'completed' || s === 'finished' || s === 'ended';

  const phases: Array<Omit<TournamentPhase, 'state'> & { done: boolean; current: boolean }> = [
    {
      id: 'reg-open',
      label: 'Registration opened',
      detail: 'Players can enter',
      done: registrationDone || live || completed,
      current: s === 'registration',
    },
    {
      id: 'bracket',
      label: 'Bracket generated',
      detail: `${rounds} rounds seeded`,
      done: live || completed,
      current: false,
    },
    {
      id: 'rounds',
      label: 'Rounds in progress',
      detail: `Best of ${rounds}`,
      done: completed,
      current: live,
    },
    {
      id: 'final',
      label: 'Grand final',
      detail: 'Top seeds clash',
      done: completed,
      current: false,
    },
    {
      id: 'champion',
      label: 'Champion crowned',
      detail: 'Winner decided',
      done: completed,
      current: false,
    },
    {
      id: 'prizes',
      label: 'Prizes distributed',
      detail: 'Rewards paid out',
      done: completed,
      current: false,
    },
  ];

  return phases.map((p) => ({
    id: p.id,
    label: p.label,
    detail: p.detail,
    state: p.done ? 'done' : p.current ? 'current' : 'upcoming',
  }));
}
