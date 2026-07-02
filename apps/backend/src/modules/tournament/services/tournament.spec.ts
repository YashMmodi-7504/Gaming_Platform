import { TournamentEngine, awardsTotal, type TournamentConfig } from '@gaming-platform/tournament-core';

/**
 * Locks the tournament + prize semantics the backend relies on, exercised
 * against the pure engine the service hydrates. Proves a full elimination event
 * crowns a champion and distributes the pool exactly (wallet payout integrity).
 */
describe('Tournament platform semantics', () => {
  const config = (): TournamentConfig => ({
    format: 'single-elimination',
    capacity: 16,
    entryFee: '10',
    prize: {
      type: 'percentage',
      currencyId: 'c',
      guaranteed: '0',
      entryContribution: 1,
      tiers: [
        { fromRank: 1, toRank: 1, value: 0.6 },
        { fromRank: 2, toRank: 2, value: 0.4 },
      ],
    },
  });

  it('runs an 8-player event and pays the pool exactly', () => {
    const engine = new TournamentEngine(config());
    for (let i = 1; i <= 8; i += 1) {
      engine.register({ id: `pt${i}`, userId: `u${i}`, displayName: `P${i}`, rating: 9 - i });
    }
    engine.start({ byRating: true });
    let guard = 0;
    for (;;) {
      const ready = engine.bracket!.matches.find((m) => m.state === 'ready');
      if (!ready) break;
      engine.reportMatch(ready.id, ready.slots[0].participantId!);
      if ((guard += 1) > 1000) throw new Error('loop');
    }
    const { pool, awards } = engine.complete();
    expect(pool).toBe('80'); // 10 entry * 8 players
    expect(awardsTotal(awards)).toBe('80'); // 60% + 40% to exactly the pool
    expect(engine.status).toBe('completed');
  });

  it('hydrates persisted state and resumes correctly', () => {
    const engine = new TournamentEngine(config());
    for (let i = 1; i <= 4; i += 1) {
      engine.register({ id: `pt${i}`, userId: `u${i}`, displayName: `P${i}`, rating: 5 - i });
    }
    engine.start({ byRating: true });
    const snapshot = { status: engine.status, participants: engine.list(), bracket: engine.bracket, swissRound: engine.swissRound };

    const resumed = TournamentEngine.hydrate(config(), snapshot);
    const ready = resumed.bracket!.matches.find((m) => m.state === 'ready')!;
    resumed.reportMatch(ready.id, ready.slots[0].participantId!);
    expect(resumed.bracket!.matches.some((m) => m.state === 'completed')).toBe(true);
  });
});
