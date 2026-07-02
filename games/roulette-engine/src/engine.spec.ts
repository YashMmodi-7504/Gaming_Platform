import { describe, expect, it } from 'vitest';

import {
  BetValidator,
  PayoutCalculator,
  ResultEvaluator,
  type RouletteBet,
} from './bets';
import { RouletteEngine } from './engine';
import { ProvablyFairWheel } from './provably-fair';
import { ROULETTE_VARIANT_KEYS, VariantResolver } from './presets';
import { RuleResolver, RuleValidationError } from './rules';
import { Wheel, WheelDeserializer, WheelSerializer, pocketLabel } from './wheel';

const resolver = new VariantResolver();

describe('wheel & layout', () => {
  it('builds the European (37) and American (38) rings', () => {
    expect(new Wheel(resolver.resolve('european').layout).size).toBe(37);
    expect(new Wheel(resolver.resolve('american').layout).size).toBe(38);
  });

  it('colours pockets from layout data', () => {
    const wheel = new Wheel(resolver.resolve('european').layout);
    expect(wheel.forNumber(0)!.color).toBe('green');
    expect(wheel.forNumber(1)!.color).toBe('red');
    expect(wheel.forNumber(2)!.color).toBe('black');
  });

  it('labels the double zero as 00', () => {
    expect(pocketLabel(37)).toBe('00');
    expect(new Wheel(resolver.resolve('american').layout).forNumber(37)!.label).toBe('00');
  });

  it('round-trips a wheel through serialize/deserialize', () => {
    const layout = resolver.resolve('american').layout;
    const decoded = WheelDeserializer.decode(WheelSerializer.encode(layout));
    expect(decoded.sequence).toEqual(layout.sequence);
    expect(decoded.greenPockets).toEqual(layout.greenPockets);
  });
});

describe('provably-fair wheel', () => {
  it('spins deterministically and verifies', () => {
    const layout = resolver.resolve('european').layout;
    const a = ProvablyFairWheel.spin('seed-1', layout);
    const b = ProvablyFairWheel.spin('seed-1', layout);
    expect(a.pocket).toBe(b.pocket);
    expect(ProvablyFairWheel.verify('seed-1', layout, a.pocket)).toBe(true);
    expect(ProvablyFairWheel.verify('seed-2', layout, a.pocket === 0 ? 1 : 0)).toBe(false);
  });

  it('always lands on a real pocket', () => {
    const layout = resolver.resolve('american').layout;
    for (let i = 0; i < 200; i += 1) {
      const { pocket } = ProvablyFairWheel.spin(`s-${i}`, layout);
      expect(layout.sequence).toContain(pocket);
    }
  });
});

describe('rules', () => {
  it('resolves and validates every built-in variant', () => {
    for (const key of ROULETTE_VARIANT_KEYS) {
      const ruleset = resolver.resolve(key);
      expect(ruleset.key).toBe(key);
      expect(ruleset.betTypes.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid rulesets', () => {
    expect(() => RuleResolver.resolve({ key: '', layout: resolver.resolve('european').layout })).toThrow(
      RuleValidationError,
    );
    expect(() => RuleResolver.resolve({ key: 'bad', betTypes: [] })).toThrow(RuleValidationError);
  });
});

describe('bets — evaluator & validation', () => {
  const ruleset = resolver.resolve('european');

  it('computes covered numbers for outside bets', () => {
    const red = RuleResolver.betType(ruleset, 'red')!;
    expect(ResultEvaluator.coveredNumbers(ruleset.layout, red)).toContain(1);
    const dozen = RuleResolver.betType(ruleset, 'dozen')!;
    expect(ResultEvaluator.coveredNumbers(ruleset.layout, dozen, [2])).toContain(13);
    const column = RuleResolver.betType(ruleset, 'column')!;
    expect(ResultEvaluator.coveredNumbers(ruleset.layout, column, [1])).toEqual(
      expect.arrayContaining([1, 4, 7]),
    );
  });

  it('rejects unknown bets, bad selection sizes and over-limit stakes', () => {
    expect(() => BetValidator.validate(ruleset, [{ type: 'nope', amount: '1' }])).toThrow();
    expect(() => BetValidator.validate(ruleset, [{ type: 'split', amount: '1', selection: [1] }])).toThrow();
    expect(() => BetValidator.validate(ruleset, [{ type: 'red', amount: '999999999' }])).toThrow();
  });
});

describe('payouts', () => {
  const ruleset = resolver.resolve('european');

  it('pays a straight bet 36x on a hit', () => {
    const settlement = PayoutCalculator.settle(ruleset, [{ type: 'straight', amount: '10', selection: [17] }], 17);
    expect(settlement.totalWin).toBe('360');
  });

  it('loses an outside bet on a miss', () => {
    const settlement = PayoutCalculator.settle(ruleset, [{ type: 'red', amount: '10' }], 2);
    expect(settlement.totalWin).toBe('0');
  });

  it('applies La Partage half-back on zero (French)', () => {
    const french = resolver.resolve('french');
    const settlement = PayoutCalculator.settle(french, [{ type: 'red', amount: '10' }], 0);
    expect(settlement.totalWin).toBe('5');
    expect(settlement.bets[0]!.outcome).toBe('push');
  });
});

describe('RouletteEngine.spin', () => {
  it('is deterministic for a seed', () => {
    const bets: RouletteBet[] = [{ type: 'red', amount: '10' }];
    const r1 = new RouletteEngine(resolver.resolve('european'), 'seed-x').spin('r', bets);
    const r2 = new RouletteEngine(resolver.resolve('european'), 'seed-x').spin('r', bets);
    expect(r1.pocket).toBe(r2.pocket);
    expect(r1.settlement).toEqual(r2.settlement);
  });

  it('produces a coherent settled result', () => {
    const result = new RouletteEngine(resolver.resolve('american'), 'seed-a').spin('r', [
      { type: 'red', amount: '5' },
      { type: 'straight', amount: '1', selection: [7] },
    ]);
    expect(result.mode).toBe('roulette');
    expect(result.pocketLabel).toBe(pocketLabel(result.pocket));
    expect(Number(result.settlement.totalBet)).toBe(6);
    expect(result.verification.seed).toBe('seed-a');
  });

  it('settles a winning straight at 36x when the seed hits the number', () => {
    const ruleset = resolver.resolve('european');
    let proven = false;
    for (let i = 0; i < 200 && !proven; i += 1) {
      const seed = `hit-${i}`;
      const { pocket } = ProvablyFairWheel.spin(seed, ruleset.layout);
      if (pocket > 0 && pocket <= 36) {
        const result = new RouletteEngine(ruleset, seed).spin('r', [
          { type: 'straight', amount: '10', selection: [pocket] },
        ]);
        expect(result.settlement.totalWin).toBe('360');
        expect(result.winningBets).toEqual(['straight']);
        proven = true;
      }
    }
    expect(proven).toBe(true);
  });

  it('handles many concurrent independent spins', async () => {
    const ruleset = resolver.resolve('european');
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(new RouletteEngine(ruleset, `c-${i}`).spin('r', [{ type: 'black', amount: '1' }])),
      ),
    );
    expect(results).toHaveLength(100);
    results.forEach((r) => expect(ruleset.layout.sequence).toContain(r.pocket));
  });
});
