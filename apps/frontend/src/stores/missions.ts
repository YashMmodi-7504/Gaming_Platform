import { create } from 'zustand';

import { useDemoWallet } from './demo-wallet';
import { usePlayerProfile } from './player-profile';

/**
 * Daily & weekly missions (prototype). Deterministic seeded progress so the
 * board is never empty, live-tracked as you play the prototype games, and
 * claimable for coins + XP with a reward animation. Never touches the backend.
 */
export interface Mission {
  id: string;
  title: string;
  desc: string;
  icon: string; // lucide name
  target: number;
  progress: number;
  coins: number;
  xp: number;
  claimed: boolean;
  /** What advances this mission: play any/specific game, win, or reach a multiplier. */
  track?: { kind: 'play' | 'win'; game?: 'crash' | 'dice' | 'roulette' };
}

export interface TrackEvent {
  /** Any prototype game slug (crash/dice/roulette/blackjack/…). */
  game: string;
  win: boolean;
}

const DAILY: Mission[] = [
  { id: 'd-play-crash', title: 'Crash Runner', desc: 'Play Crash 3 times', icon: 'Rocket', target: 3, progress: 2, coins: 1500, xp: 120, claimed: false, track: { kind: 'play', game: 'crash' } },
  { id: 'd-win-roulette', title: 'Lucky Spins', desc: 'Win 5 Roulette rounds', icon: 'CircleDot', target: 5, progress: 5, coins: 2500, xp: 200, claimed: false, track: { kind: 'win', game: 'roulette' } },
  { id: 'd-play-dice', title: 'Roll Call', desc: 'Play Dice 5 times', icon: 'Dice5', target: 5, progress: 3, coins: 1000, xp: 100, claimed: false, track: { kind: 'play', game: 'dice' } },
  { id: 'd-win-any', title: 'On a Roll', desc: 'Win 8 rounds in any game', icon: 'Sparkles', target: 8, progress: 6, coins: 1800, xp: 150, claimed: false, track: { kind: 'win' } },
  { id: 'd-play-any', title: 'Warm Up', desc: 'Play 10 rounds today', icon: 'Gamepad2', target: 10, progress: 10, coins: 800, xp: 80, claimed: false, track: { kind: 'play' } },
];

const WEEKLY: Mission[] = [
  { id: 'w-win-30', title: 'Winning Week', desc: 'Win 30 rounds this week', icon: 'Trophy', target: 30, progress: 22, coins: 8000, xp: 600, claimed: false, track: { kind: 'win' } },
  { id: 'w-play-crash-20', title: 'Sky High', desc: 'Play Crash 20 times', icon: 'Rocket', target: 20, progress: 14, coins: 6000, xp: 500, claimed: false, track: { kind: 'play', game: 'crash' } },
  { id: 'w-play-100', title: 'Marathon', desc: 'Play 100 rounds this week', icon: 'Flame', target: 100, progress: 68, coins: 12000, xp: 900, claimed: false, track: { kind: 'play' } },
  { id: 'w-win-dice-15', title: 'Dice Master', desc: 'Win 15 Dice rounds', icon: 'Dice5', target: 15, progress: 15, coins: 7000, xp: 550, claimed: false, track: { kind: 'win', game: 'dice' } },
];

interface MissionState {
  daily: Mission[];
  weekly: Mission[];
  track: (e: TrackEvent) => void;
  claim: (id: string) => { coins: number; xp: number } | null;
}

function advance(list: Mission[], e: TrackEvent): Mission[] {
  return list.map((m) => {
    if (m.claimed || !m.track) return m;
    const t = m.track;
    const matchesGame = !t.game || t.game === e.game;
    const matchesKind = t.kind === 'play' || (t.kind === 'win' && e.win);
    if (matchesGame && matchesKind && m.progress < m.target) {
      return { ...m, progress: Math.min(m.target, m.progress + 1) };
    }
    return m;
  });
}

export const useMissions = create<MissionState>((set, get) => ({
  daily: DAILY,
  weekly: WEEKLY,
  track: (e) => set((s) => ({ daily: advance(s.daily, e), weekly: advance(s.weekly, e) })),
  claim: (id) => {
    const all = [...get().daily, ...get().weekly];
    const m = all.find((x) => x.id === id);
    if (!m || m.claimed || m.progress < m.target) return null;
    useDemoWallet.getState().bonus(m.coins, { label: `Mission: ${m.title}`, source: 'mission' });
    usePlayerProfile.getState().addXp(m.xp);
    set((s) => ({
      daily: s.daily.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
      weekly: s.weekly.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
    }));
    return { coins: m.coins, xp: m.xp };
  },
}));
