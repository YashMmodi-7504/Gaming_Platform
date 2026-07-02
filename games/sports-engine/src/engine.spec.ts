import { describe, expect, it } from 'vitest';

import { BetSlipManager, BetValidator } from './betslip';
import { SportsEngine } from './engine';
import { MarketManager, MARKET_TEMPLATE_KEYS } from './markets';
import { OddsManager } from './odds';
import { SportResolver, SPORT_KEYS } from './presets';
import { RuleValidationError, VariantResolver } from './rules';
import { SettlementManager } from './settlement';
import { settleBet } from './plugin';
import type { BetSelection, Market, Match, MatchResult } from './types';

const rules = new VariantResolver().resolve('standard');

function leg(over: Partial<BetSelection> = {}): BetSelection {
  return {
    matchId: 'm1',
    marketId: 'mk1',
    selectionId: 's1',
    odds: 2,
    status: 'pending',
    ...over,
  };
}

describe('catalog & presets', () => {
  it('exposes every built-in sport with declared markets', () => {
    const resolver = new SportResolver();
    for (const key of SPORT_KEYS) {
      const sport = resolver.resolve(key);
      expect(sport.key).toBe(key);
      expect(sport.marketTypes.length).toBeGreaterThan(0);
      for (const mt of sport.marketTypes) expect(MARKET_TEMPLATE_KEYS).toContain(mt);
    }
  });

  it('builds a market from a template', () => {
    const market = MarketManager.build({
      id: 'mk1',
      templateKey: 'match-winner',
      selections: [
        { id: 'home', name: 'Home', odds: 2.1, status: 'open' },
        { id: 'draw', name: 'Draw', odds: 3.2, status: 'open' },
        { id: 'away', name: 'Away', odds: 3.8, status: 'open' },
      ],
    });
    expect(market.settlement).toBe('outright');
    expect(market.selections).toHaveLength(3);
  });
});

describe('odds maths', () => {
  it('converts between formats', () => {
    expect(OddsManager.format(2.5, 'american')).toBe('+150');
    expect(OddsManager.format(1.5, 'american')).toBe('-200');
    expect(OddsManager.toDecimal('+150', 'american')).toBe(2.5);
    expect(OddsManager.format(3, 'fractional')).toBe('2/1');
  });

  it('combines accumulator odds and computes payout', () => {
    expect(OddsManager.combine([2, 3])).toBe(6);
    expect(OddsManager.payout(10, 6)).toBe(60);
  });

  it('computes book overround', () => {
    const market: Market = {
      id: 'mk1',
      templateKey: 'money-line',
      name: 'ML',
      settlement: 'outright',
      status: 'open',
      selections: [
        { id: 'a', name: 'A', odds: 2, status: 'open' },
        { id: 'b', name: 'B', odds: 2, status: 'open' },
      ],
    };
    expect(OddsManager.overround(market)).toBe(0); // fair book at 2.0/2.0
  });
});

describe('settlement modes', () => {
  const outright: Market = {
    id: 'mk1',
    templateKey: 'match-winner',
    name: 'MW',
    settlement: 'outright',
    status: 'open',
    selections: [
      { id: 'home', name: 'Home', odds: 2, status: 'open' },
      { id: 'away', name: 'Away', odds: 3, status: 'open' },
    ],
  };
  const overUnder: Market = {
    id: 'mk2',
    templateKey: 'over-under',
    name: 'O/U 2.5',
    settlement: 'line',
    status: 'open',
    line: 2.5,
    selections: [
      { id: 'over', name: 'Over', odds: 1.9, status: 'open', line: 2.5, side: 'over' },
      { id: 'under', name: 'Under', odds: 1.9, status: 'open', line: 2.5, side: 'under' },
    ],
  };

  it('settles outright markets by declared winners', () => {
    const result: MatchResult = { winners: { mk1: ['home'] }, lines: {}, voids: [] };
    expect(SettlementManager.settleSelection(outright, outright.selections[0]!, result)).toBe('won');
    expect(SettlementManager.settleSelection(outright, outright.selections[1]!, result)).toBe('lost');
  });

  it('settles line markets with push → void', () => {
    const over = SettlementManager.settleSelection(overUnder, overUnder.selections[0]!, {
      winners: {},
      lines: { mk2: 3 },
      voids: [],
    });
    expect(over).toBe('won');
    const push = SettlementManager.settleSelection(overUnder, overUnder.selections[0]!, {
      winners: {},
      lines: { mk2: 2.5 },
      voids: [],
    });
    expect(push).toBe('void');
  });

  it('voids forced selections', () => {
    expect(
      SettlementManager.settleSelection(outright, outright.selections[0]!, {
        winners: { mk1: ['home'] },
        lines: {},
        voids: ['home'],
      }),
    ).toBe('void');
  });

  it('settles an accumulator: void leg refunds, won legs multiply', () => {
    const slip = BetSlipManager.build({
      type: 'accumulator',
      stake: '10',
      at: 1,
      selections: [leg({ selectionId: 'a', odds: 2 }), leg({ selectionId: 'b', marketId: 'mk2', odds: 3 })],
    });
    const statuses = new Map([
      ['a', 'won' as const],
      ['b', 'void' as const],
    ]);
    const settlement = SettlementManager.settleSlip(slip, statuses);
    expect(settlement.status).toBe('won');
    expect(settlement.returned).toBe('20'); // 10 × (2 × 1)
  });
});

describe('bet slip pricing & validation', () => {
  it('prices single and accumulator slips', () => {
    expect(BetSlipManager.quote({ type: 'single', stake: '10', selections: [leg({ odds: 2.5 })] }).potentialReturn).toBe('25');
    expect(
      BetSlipManager.quote({
        type: 'accumulator',
        stake: '10',
        selections: [leg({ odds: 2 }), leg({ marketId: 'mk2', odds: 3 })],
      }).potentialReturn,
    ).toBe('60');
  });

  it('rejects invalid slips', () => {
    expect(() => BetValidator.validate(rules, { type: 'single', stake: '0', selections: [leg()] })).toThrow(RuleValidationError);
    expect(() =>
      BetValidator.validate(rules, { type: 'accumulator', stake: '10', selections: [leg({ odds: 2 }), leg({ odds: 3 })] }),
    ).toThrow(/same market/);
    expect(() => BetValidator.validate(rules, { type: 'single', stake: '10', selections: [leg({ odds: 5000 })] })).toThrow();
  });
});

describe('SportsEngine', () => {
  const engine = new SportsEngine(rules);

  it('places and settles a winning single', () => {
    const slip = engine.place({ type: 'single', stake: '10', at: 1, selections: [leg({ odds: 2 })] });
    expect(slip.status).toBe('pending');

    const match: Match = {
      id: 'm1',
      competitionKey: 'c1',
      sportKey: 'football',
      name: 'A vs B',
      participants: [],
      startTime: '2026-01-01T00:00:00Z',
      status: 'finished',
      markets: [
        {
          id: 'mk1',
          templateKey: 'match-winner',
          name: 'MW',
          settlement: 'outright',
          status: 'open',
          selections: [{ id: 's1', name: 'A', odds: 2, status: 'open' }],
        },
      ],
      result: { winners: { mk1: ['s1'] }, lines: {}, voids: [] },
    };
    const settlement = engine.settle(slip, new Map([['m1', match]]));
    expect(settlement.status).toBe('won');
    expect(settlement.returned).toBe('20');
  });

  it('handles many concurrent settlements', async () => {
    const slips = Array.from({ length: 100 }, (_, i) =>
      engine.place({ type: 'single', stake: '1', at: i, selections: [leg({ odds: 2 })] }),
    );
    const match: Match = {
      id: 'm1',
      competitionKey: 'c1',
      sportKey: 'football',
      name: 'A vs B',
      participants: [],
      startTime: '2026-01-01T00:00:00Z',
      status: 'finished',
      markets: [
        {
          id: 'mk1',
          templateKey: 'match-winner',
          name: 'MW',
          settlement: 'outright',
          status: 'open',
          selections: [{ id: 's1', name: 'A', odds: 2, status: 'open' }],
        },
      ],
      result: { winners: { mk1: ['s1'] }, lines: {}, voids: [] },
    };
    const results = await Promise.all(slips.map((s) => Promise.resolve(engine.settle(s, new Map([['m1', match]])))));
    expect(results).toHaveLength(100);
    results.forEach((r) => expect(r.status).toBe('won'));
  });
});

describe('legacy plugin settlement (back-compat)', () => {
  it('still settles decimal-odds bets', () => {
    const bet = {
      betId: 'b1',
      amount: '10',
      type: 'accumulator' as const,
      selections: [
        { marketId: 'm1', selectionId: 's1', odds: 2 },
        { marketId: 'm2', selectionId: 's2', odds: 3 },
      ],
    };
    expect(settleBet(bet, { s1: 'won', s2: 'won' })).toEqual({ status: 'won', multiplier: 6 });
    expect(settleBet(bet, { s1: 'lost', s2: 'won' })).toEqual({ status: 'lost', multiplier: 0 });
  });
});
