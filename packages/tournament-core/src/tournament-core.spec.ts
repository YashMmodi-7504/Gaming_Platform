import { describe, expect, it } from 'vitest';
import { Money } from '@gaming-platform/wallet-core';

import {
  doubleElimination,
  roundRobin,
  singleElimination,
  swissPairing,
} from './bracket';
import { TournamentEngine, type TournamentConfig } from './engine';
import { TournamentLifecycle, TournamentLifecycleError } from './lifecycle';
import { Levels, Missions, Streaks, type MissionDefinition } from './missions';
import { awardsTotal, computePool, distributePrizes, type RankedEntry } from './prizes';
import { rankParticipants } from './ranking';
import { nextPowerOfTwo, standardSeedOrder } from './seeding';
import type { Participant, PrizeConfig } from './types';

function players(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    userId: `u${i + 1}`,
    displayName: `Player ${i + 1}`,
    rating: n - i,
    seed: i + 1,
    checkedIn: true,
    status: 'active' as const,
    score: 0,
  }));
}

/** Play a full elimination bracket to a single champion (favourite always wins). */
function playOut(engine: TournamentEngine): void {
  let guard = 0;
  for (;;) {
    const ready = engine.bracket!.matches.find((m) => m.state === 'ready');
    if (!ready) break;
    const a = ready.slots[0].participantId!;
    engine.reportMatch(ready.id, a);
    if ((guard += 1) > 10000) throw new Error('non-terminating bracket');
  }
}

describe('seeding & brackets', () => {
  it('produces standard seed order', () => {
    expect(standardSeedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(standardSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(nextPowerOfTwo(13)).toBe(16);
  });

  it('builds a single-elimination bracket with byes', () => {
    const b = singleElimination(players(6));
    expect(b.rounds).toBe(3); // padded to 8
    expect(b.matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(b.matches.some((m) => m.state === 'bye')).toBe(true);
  });

  it('builds a double-elimination bracket of 2n-2 matches', () => {
    for (const n of [4, 8, 16]) {
      const b = doubleElimination(players(n));
      expect(b.matches).toHaveLength(2 * n - 2);
      expect(b.matches.some((m) => m.bracket === 'final')).toBe(true);
    }
  });

  it('builds a round-robin where everyone plays everyone once', () => {
    const b = roundRobin(players(4));
    expect(b.matches).toHaveLength((4 * 3) / 2);
  });

  it('pairs a Swiss round without rematches', () => {
    const b = swissPairing(players(8), 1, new Set());
    expect(b.matches).toHaveLength(4);
  });
});

describe('elimination play-out', () => {
  const config = (format: TournamentConfig['format']): TournamentConfig => ({
    format,
    capacity: 64,
    entryFee: '0',
    prize: { type: 'winner-take-all', currencyId: 'c', guaranteed: '1000', entryContribution: 0, tiers: [{ fromRank: 1, toRank: 1, value: 1 }] },
  });

  it('crowns a single champion in single elimination', () => {
    const engine = new TournamentEngine(config('single-elimination'));
    players(8).forEach((p) => engine.register(p));
    engine.start({ byRating: true });
    playOut(engine);
    expect(engine.champion()?.id).toBe('p1'); // top seed always wins
    expect(engine.standings()[0]!.rank).toBe(1);
  });

  it('crowns a champion in double elimination', () => {
    const engine = new TournamentEngine(config('double-elimination'));
    players(4).forEach((p) => engine.register(p));
    engine.start({ byRating: true });
    playOut(engine);
    expect(engine.champion()).not.toBeNull();
  });
});

describe('lifecycle', () => {
  it('enforces legal transitions', () => {
    expect(TournamentLifecycle.transition('registration', 'live')).toBe('live');
    expect(() => TournamentLifecycle.transition('completed', 'live')).toThrow(TournamentLifecycleError);
  });
});

describe('prize distribution — exact sums', () => {
  const ranked = (n: number): RankedEntry[] =>
    Array.from({ length: n }, (_, i) => ({ participantId: `p${i + 1}`, userId: `u${i + 1}`, rank: i + 1 }));

  it('winner-take-all pays the whole pool to first', () => {
    const cfg: PrizeConfig = { type: 'winner-take-all', currencyId: 'c', guaranteed: '1000', entryContribution: 0, tiers: [{ fromRank: 1, toRank: 1, value: 1 }] };
    const awards = distributePrizes(cfg, '1000', ranked(10));
    expect(awards).toHaveLength(1);
    expect(awards[0]!.amount).toBe('1000');
  });

  it('percentage distribution sums to the pool exactly', () => {
    const cfg: PrizeConfig = {
      type: 'percentage',
      currencyId: 'c',
      guaranteed: '1000',
      entryContribution: 0,
      tiers: [
        { fromRank: 1, toRank: 1, value: 0.5 },
        { fromRank: 2, toRank: 2, value: 0.3 },
        { fromRank: 3, toRank: 5, value: 0.2 }, // split across 3 ranks
      ],
    };
    const awards = distributePrizes(cfg, '1000', ranked(8));
    expect(awardsTotal(awards)).toBe('1000');
    expect(awards[0]!.amount).toBe(Money.add('500', '0')); // first place + remainder
  });

  it('even-split divides a pool exactly to the last unit', () => {
    const cfg: PrizeConfig = { type: 'even-split', currencyId: 'c', guaranteed: '100', entryContribution: 0, tiers: [{ fromRank: 1, toRank: 3, value: 0 }] };
    const awards = distributePrizes(cfg, '100', ranked(3));
    expect(awardsTotal(awards)).toBe('100'); // 33.33.. split, remainder to #1
  });

  it('computes dynamic overlay pools', () => {
    const cfg: PrizeConfig = { type: 'winner-take-all', currencyId: 'c', guaranteed: '500', entryContribution: 0.8, tiers: [] };
    expect(computePool(cfg, 100, '10')).toBe('1300'); // 500 + 0.8*10*100
  });
});

describe('ranking', () => {
  it('ranks with standard competition ranking (ties share rank)', () => {
    const ps = players(3);
    ps[0]!.score = 10;
    ps[1]!.score = 10;
    ps[2]!.score = 5;
    const standings = rankParticipants(ps);
    expect(standings.map((s) => s.rank)).toEqual([1, 1, 3]);
  });
});

describe('missions, streaks & levels', () => {
  it('advances and completes a mission', () => {
    const def: MissionDefinition = { id: 'm1', name: 'Bet 3', window: 'daily', metric: 'bets', target: 3, xp: 50 };
    let progress = { missionId: 'm1', value: 0, completed: false };
    for (let i = 0; i < 3; i += 1) progress = Missions.apply(def, progress, { metric: 'bets' });
    expect(progress.completed).toBe(true);
    expect(Missions.percent(def, progress)).toBe(100);
  });

  it('tracks consecutive-day streaks', () => {
    let s = { current: 0, longest: 0, lastDay: null as number | null };
    s = Streaks.record(s, 10);
    s = Streaks.record(s, 11);
    s = Streaks.record(s, 12);
    expect(s.current).toBe(3);
    s = Streaks.record(s, 20); // gap resets
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
  });

  it('computes levels from XP monotonically', () => {
    expect(Levels.levelForXp(0)).toBe(1);
    expect(Levels.xpForLevel(2)).toBeGreaterThan(0);
    expect(Levels.levelForXp(Levels.xpForLevel(5))).toBe(5);
  });
});

describe('load: 1024-player bracket + 512-way payout', () => {
  it('generates and plays a large bracket and distributes exactly', () => {
    const engine = new TournamentEngine({
      format: 'single-elimination',
      capacity: 2048,
      entryFee: '5',
      prize: {
        type: 'percentage',
        currencyId: 'c',
        guaranteed: '0',
        entryContribution: 1,
        tiers: [
          { fromRank: 1, toRank: 1, value: 0.5 },
          { fromRank: 2, toRank: 2, value: 0.25 },
          { fromRank: 3, toRank: 512, value: 0.25 },
        ],
      },
    });
    players(1024).forEach((p) => engine.register(p));
    engine.start({ byRating: true });
    expect(engine.bracket!.matches).toHaveLength(1023);
    playOut(engine);
    const { pool, awards } = engine.complete();
    expect(pool).toBe('5120'); // 1*5*1024
    expect(awardsTotal(awards)).toBe(pool); // exact to the last unit across 512 winners
  });
});
