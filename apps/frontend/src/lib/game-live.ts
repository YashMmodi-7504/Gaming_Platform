/**
 * Deterministic "live game" generators (crash multipliers, biggest wins,
 * cashouts, chat, dice history/stats). Pure functions of a seed/index — no
 * `Date.now()` / `Math.random()` — so SSR and client agree with no hydration
 * drift. Backend-free. Complements `live-activity` and `player-presence`.
 */

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

const NAMES = [
  'NovaStrike', 'CryptoFox', 'LunaBet', 'PixelKing', 'Vortex', 'GoldRush', 'Zenith',
  'Mirage', 'ApexWolf', 'Onyx', 'Cobalt', 'Riptide', 'Solaris', 'Ember', 'Quasar',
] as const;

/** Deterministic live player count that drifts with `phase`. */
export function livePlayers(seed: string, phase = 0): number {
  const base = 900 + (hash(`lp-${seed}`) % 5200);
  return base + Math.round(Math.sin(phase / 2) * 40 + Math.sin(phase) * 12);
}

/* ------------------------------------------------------------------ */
/* Crash                                                              */
/* ------------------------------------------------------------------ */

/** Latest crash multipliers (newest first), deterministic. */
export function latestMultipliers(count = 16): number[] {
  const seq = [1.18, 2.41, 5.92, 1.04, 12.7, 3.33, 1.87, 24.6, 1.52, 8.09, 1.31, 49.2, 2.05, 1.62, 3.98, 1.09, 7.44, 1.21, 15.3, 2.77];
  return Array.from({ length: count }, (_, i) => pick(seq, i));
}

export interface WinRow {
  name: string;
  mult: number;
  amount: number;
}

/** Top multipliers today (highest first). */
export function topMultipliers(count = 5): WinRow[] {
  const seq: WinRow[] = [
    { name: 'NovaStrike', mult: 184.21, amount: 46_052 },
    { name: 'CryptoFox', mult: 92.18, amount: 23_045 },
    { name: 'LunaBet', mult: 64.74, amount: 16_185 },
    { name: 'PixelKing', mult: 38.5, amount: 9_625 },
    { name: 'Vortex', mult: 27.9, amount: 6_975 },
    { name: 'Onyx', mult: 19.4, amount: 4_850 },
  ];
  return seq.slice(0, count);
}

/** Biggest wins across games today. */
export function biggestWins(count = 6): Array<WinRow & { game: string }> {
  const games = ['Crash', 'Dice', 'Roulette', 'Blackjack', 'Plinko', 'Mines'];
  return Array.from({ length: count }, (_, i) => {
    const h = hash(`bw-${i}`);
    const mult = Number((2 + (h % 480) / 10).toFixed(2));
    const amount = 2000 + (h % 90) * 500;
    return { name: pick(NAMES, h), game: pick(games, h >> 4), mult, amount };
  });
}

/* ------------------------------------------------------------------ */
/* Deterministic chat                                                 */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  tone: 'good' | 'neutral' | 'gold';
}

const CHAT_LINES: { text: string; tone: ChatMessage['tone'] }[] = [
  { text: 'cashed at 2.4x 🚀', tone: 'good' },
  { text: 'hold the line', tone: 'neutral' },
  { text: 'that was close 😅', tone: 'neutral' },
  { text: 'gg', tone: 'neutral' },
  { text: 'big one incoming', tone: 'gold' },
  { text: 'auto cashout ftw', tone: 'good' },
  { text: 'rug pulled again 💀', tone: 'neutral' },
  { text: 'lets goooo', tone: 'good' },
  { text: 'moon mission 🌙', tone: 'gold' },
  { text: 'nice pull', tone: 'good' },
  { text: 'paper hands', tone: 'neutral' },
  { text: 'diamond hands 💎', tone: 'gold' },
];

/** Deterministic chat feed (newest last). */
export function liveChat(seed: string, count = 10): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => {
    const h = hash(`chat-${seed}-${i}`);
    const line = pick(CHAT_LINES, h);
    return { id: i, name: pick(NAMES, h >> 3), text: line.text, tone: line.tone };
  });
}

/* ------------------------------------------------------------------ */
/* Dice                                                               */
/* ------------------------------------------------------------------ */

export interface DiceRoll {
  id: number;
  value: number;
  win: boolean;
}

/** Recent dice results (newest first). */
export function diceHistory(seed: string, count = 24): DiceRoll[] {
  return Array.from({ length: count }, (_, i) => {
    const h = hash(`dice-${seed}-${i}`);
    const value = h % 100;
    return { id: i, value, win: value > 50 };
  });
}

export function hotColdNumbers(seed: string): { hot: number[]; cold: number[] } {
  const h = hash(`hc-${seed}`);
  const hot = Array.from({ length: 4 }, (_, i) => (h >> (i * 3)) % 100);
  const cold = Array.from({ length: 4 }, (_, i) => (h >> (i * 3 + 13)) % 100);
  return { hot, cold };
}

export interface DiceSession {
  rolls: number;
  wins: number;
  winRate: number;
  profit: number;
  bestStreak: number;
}

export function diceSession(seed: string): DiceSession {
  const h = hash(`ds-${seed}`);
  const rolls = 40 + (h % 160);
  const wins = Math.round(rolls * (0.44 + (h % 20) / 100));
  return {
    rolls,
    wins,
    winRate: Math.round((wins / rolls) * 100),
    profit: (h % 2 === 0 ? 1 : -1) * (500 + (h % 40) * 120),
    bestStreak: 3 + (h % 9),
  };
}
