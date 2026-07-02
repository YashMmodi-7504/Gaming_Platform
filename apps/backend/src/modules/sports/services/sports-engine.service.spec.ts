import type { Match } from '@gaming-platform/sports-engine';

import { SportsEngineService } from './sports-engine.service';

describe('SportsEngineService', () => {
  const service = new SportsEngineService();

  it('lists built-in sports and market templates', () => {
    expect(service.listSports().length).toBeGreaterThanOrEqual(18);
    expect(service.marketTemplates().some((m) => m.key === 'match-winner')).toBe(true);
    expect(service.listProfiles().some((p) => p.key === 'standard')).toBe(true);
  });

  it('prices an accumulator', () => {
    const quote = service.quote({
      type: 'accumulator',
      stake: '10',
      selections: [
        { matchId: 'm1', marketId: 'mk1', selectionId: 'a', odds: 2, status: 'pending' },
        { matchId: 'm2', marketId: 'mk2', selectionId: 'b', odds: 3, status: 'pending' },
      ],
    });
    expect(quote.combinedOdds).toBe(6);
    expect(quote.potentialReturn).toBe('60');
  });

  it('settles a slip against match results', () => {
    const slip = {
      betId: 'b1',
      type: 'single' as const,
      stake: '10',
      combinedOdds: 2,
      potentialReturn: '20',
      status: 'pending' as const,
      createdAt: 1,
      selections: [
        { matchId: 'm1', marketId: 'mk1', selectionId: 's1', odds: 2, status: 'pending' as const },
      ],
    };
    const match: Match = {
      id: 'm1',
      competitionKey: 'c1',
      sportKey: 'football',
      name: 'A vs B',
      participants: [],
      startTime: '2026-01-01T00:00:00Z',
      status: 'settled',
      markets: [
        {
          id: 'mk1',
          templateKey: 'match-winner',
          name: 'MW',
          settlement: 'outright',
          status: 'settled',
          selections: [{ id: 's1', name: 'A', odds: 2, status: 'open' }],
        },
      ],
      result: { winners: { mk1: ['s1'] }, lines: {}, voids: [] },
    };
    const settlement = service.settle({ slip, matches: [match] });
    expect(settlement.status).toBe('won');
    expect(settlement.returned).toBe('20');
  });

  it('converts odds formats', () => {
    expect(service.formatOdds(2.5, 'american')).toBe('+150');
  });
});
