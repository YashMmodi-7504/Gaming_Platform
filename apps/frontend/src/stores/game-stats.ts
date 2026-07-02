import { create } from 'zustand';

import { useMissions } from './missions';

/**
 * Client-side game statistics for the playable prototypes. Deterministic seeded
 * history so a game is never empty on first load, then live-updated as the
 * player plays. Purely cosmetic — never touches the backend.
 *
 * The original three games (crash/dice/roulette) keep a strongly-typed `games`
 * map so their pages stay non-nullable; every other prototype lives in the
 * generic `catalog` map (use the `useGameStat(slug)` hook to read it).
 */
export interface Round {
  id: number;
  /** Short display value, e.g. "2.41×", "73.40", "17 Red", "Blackjack!". */
  label: string;
  win: boolean;
  /** Net payout (can be negative on a loss = -stake). */
  payout: number;
  /** Numeric result used for highest/average calcs. */
  value: number;
}

export interface GameStat {
  history: Round[]; // most recent first, capped at 20
  rounds: number;
  highest: number;
  biggestWin: number;
  streak: number; // current win streak
  bestStreak: number;
  wagered: number;
  seq: number;
}

type CoreKey = 'crash' | 'dice' | 'roulette';

/** Prototype game slugs that get a pre-seeded catalog entry (never empty). */
export const CATALOG_SLUGS = [
  'blackjack', 'baccarat', 'dragon-tiger', 'andar-bahar', 'lucky-7', 'casino-war',
  'teen-patti', 'three-card-poker', 'plinko', 'ball-drop', '2048', 'memory',
  'reaction', 'color-match', 'coin-drop', 'treasure',
];

interface StatsState {
  games: Record<CoreKey, GameStat>;
  catalog: Record<string, GameStat>;
  record: (game: string, r: Omit<Round, 'id'>) => void;
}

export const EMPTY_STAT: GameStat = {
  history: [], rounds: 0, highest: 0, biggestWin: 0, streak: 0, bestStreak: 0, wagered: 0, seq: 0,
};

function seed(game: string): GameStat {
  let h = 0;
  for (const c of game) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rng = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const history: Round[] = Array.from({ length: 12 }, (_, i) => {
    const r = rng();
    if (game === 'crash') {
      const v = Math.max(1, Math.round((0.99 / (1 - r)) * 100) / 100);
      return { id: i, label: `${v.toFixed(2)}×`, win: v >= 2, payout: v >= 2 ? 250 : -250, value: v };
    }
    if (game === 'dice') {
      const v = Math.round(r * 9999) / 100;
      return { id: i, label: v.toFixed(2), win: v > 50, payout: v > 50 ? 200 : -200, value: v };
    }
    if (game === 'roulette') {
      const n = Math.floor(r * 37);
      const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      return { id: i, label: `${n} ${n === 0 ? 'Green' : reds.has(n) ? 'Red' : 'Black'}`, win: reds.has(n), payout: reds.has(n) ? 300 : -300, value: n };
    }
    // Generic win/lose round for card & arcade games.
    const win = r > 0.5;
    const mult = 1 + Math.round(r * 400) / 100;
    const payout = win ? Math.round(200 * mult) : -200;
    return { id: i, label: win ? `Win ${mult.toFixed(1)}×` : 'Loss', win, payout, value: win ? mult : 0 };
  });
  const highest = Math.max(0, ...history.map((r) => r.value));
  const biggestWin = Math.max(0, ...history.filter((r) => r.win).map((r) => r.payout));
  return { history, rounds: history.length, highest, biggestWin, streak: 0, bestStreak: 3, wagered: 3000, seq: 100 };
}

function apply(g: GameStat, r: Omit<Round, 'id'>): GameStat {
  const seq = g.seq + 1;
  const round: Round = { ...r, id: seq };
  const streak = r.win ? g.streak + 1 : 0;
  return {
    history: [round, ...g.history].slice(0, 20),
    rounds: g.rounds + 1,
    highest: Math.max(g.highest, r.value),
    biggestWin: Math.max(g.biggestWin, r.win ? r.payout : 0),
    streak,
    bestStreak: Math.max(g.bestStreak, streak),
    wagered: g.wagered + Math.abs(r.payout),
    seq,
  };
}

const CATALOG_SEED: Record<string, GameStat> = Object.fromEntries(
  CATALOG_SLUGS.map((s) => [s, seed(s)]),
);

export const useGameStats = create<StatsState>((set) => ({
  games: { crash: seed('crash'), dice: seed('dice'), roulette: seed('roulette') },
  catalog: CATALOG_SEED,
  record: (game, r) => {
    useMissions.getState().track({ game, win: r.win });
    set((s) => {
      if (game === 'crash' || game === 'dice' || game === 'roulette') {
        return { games: { ...s.games, [game]: apply(s.games[game], r) } };
      }
      const cur = s.catalog[game] ?? seed(game);
      return { catalog: { ...s.catalog, [game]: apply(cur, r) } };
    });
  },
}));

/** Reactive, never-undefined accessor for any prototype game's stats. */
export function useGameStat(slug: string): GameStat {
  return useGameStats((s) => {
    if (slug === 'crash' || slug === 'dice' || slug === 'roulette') return s.games[slug];
    return s.catalog[slug] ?? EMPTY_STAT;
  });
}
