import { describe, expect, it } from 'vitest';

import {
  BetValidator,
  PayoutCalculator,
  ResultEvaluator,
  type DiceBet,
} from './bets';
import { DiceManager, DiceSerializer } from './dice';
import { DiceEngine } from './engine';
import { ProvablyFairDiceRoller } from './provably-fair';
import { DICE_VARIANT_KEYS, VariantResolver } from './presets';
import { RuleResolver, RuleValidationError, totalBounds } from './rules';

const resolver = new VariantResolver();

describe('dice & roller', () => {
  it('rolls the configured number of dice within face bounds', () => {
    const values = ProvablyFairDiceRoller.values('seed-1', 3, 6);
    expect(values).toHaveLength(3);
    values.forEach((v) => expect(v >= 1 && v <= 6).toBe(true));
  });

  it('rolls deterministically and verifies', () => {
    const a = ProvablyFairDiceRoller.verification('seed-1', 3, 6);
    const b = ProvablyFairDiceRoller.verification('seed-1', 3, 6);
    expect(a.values).toEqual(b.values);
    expect(ProvablyFairDiceRoller.verify('seed-1', 3, 6, a.values)).toBe(true);
    expect(ProvablyFairDiceRoller.verify('seed-2', 3, 6, a.values)).toBe(false);
  });

  it('computes set aggregates and serializes', () => {
    const set = DiceManager.fromValues([4, 4, 4], 6);
    expect(set.total()).toBe(12);
    expect(set.isTriple()).toBe(true);
    expect(set.occurrences(4)).toBe(3);
    expect(DiceSerializer.encode(set)).toEqual([4, 4, 4]);
  });
});

describe('rules', () => {
  it('resolves and validates every built-in variant', () => {
    for (const key of DICE_VARIANT_KEYS) {
      const ruleset = resolver.resolve(key);
      expect(ruleset.key).toBe(key);
      expect(ruleset.bets.length).toBeGreaterThan(0);
    }
  });

  it('computes total bounds from configuration', () => {
    expect(totalBounds({ diceCount: 3, faces: 6 })).toEqual({ min: 3, max: 18 });
  });

  it('rejects invalid rulesets', () => {
    expect(() => RuleResolver.resolve({ key: 'bad', diceCount: 0 })).toThrow(RuleValidationError);
    expect(() => RuleResolver.resolve({ key: 'bad', bets: [] })).toThrow(RuleValidationError);
    expect(() =>
      RuleResolver.resolve({ key: 'bad', bets: [{ key: 't', label: 'T', category: 'total', match: 'total', payout: 2, values: [99] }] }),
    ).toThrow(RuleValidationError);
  });
});

describe('evaluator', () => {
  const sicBo = resolver.resolve('sic-bo');

  it('evaluates big/small with the triple house rule', () => {
    const big = RuleResolver.bet(sicBo, 'big')!;
    const small = RuleResolver.bet(sicBo, 'small')!;
    expect(ResultEvaluator.wins(sicBo, big, DiceManager.fromValues([6, 5, 6], 6))).toBe(true); // 17
    expect(ResultEvaluator.wins(sicBo, small, DiceManager.fromValues([1, 2, 3], 6))).toBe(true); // 6
    // A triple loses big/small under the house rule.
    expect(ResultEvaluator.wins(sicBo, big, DiceManager.fromValues([6, 6, 6], 6))).toBe(false);
  });

  it('matches totals, triples, doubles and per-occurrence singles', () => {
    const total9 = RuleResolver.bet(sicBo, 'total-9')!;
    expect(ResultEvaluator.wins(sicBo, total9, DiceManager.fromValues([3, 3, 3], 6))).toBe(true);

    const triple3 = RuleResolver.bet(sicBo, 'triple-3')!;
    expect(ResultEvaluator.wins(sicBo, triple3, DiceManager.fromValues([3, 3, 3], 6))).toBe(true);

    const single5 = RuleResolver.bet(sicBo, 'single-5')!;
    const set = DiceManager.fromValues([5, 5, 2], 6);
    expect(ResultEvaluator.wins(sicBo, single5, set)).toBe(true);
    // Two matching dice ⇒ 1 + 2 = 3x total return.
    expect(ResultEvaluator.multiplier(single5, set)).toBe(3);
  });
});

describe('payouts & validation', () => {
  const sicBo = resolver.resolve('sic-bo');

  it('settles a winning specific triple at 181x', () => {
    const set = DiceManager.fromValues([4, 4, 4], 6);
    const settlement = PayoutCalculator.settle(sicBo, [{ type: 'triple-4', amount: '10' }], set);
    expect(settlement.totalWin).toBe('1810');
  });

  it('loses a missed bet', () => {
    const set = DiceManager.fromValues([1, 1, 2], 6);
    const settlement = PayoutCalculator.settle(sicBo, [{ type: 'big', amount: '10' }], set);
    expect(settlement.totalWin).toBe('0');
  });

  it('rejects unknown bets and over-limit stakes', () => {
    expect(() => BetValidator.validate(sicBo, [{ type: 'nope', amount: '1' }])).toThrow();
    expect(() => BetValidator.validate(sicBo, [{ type: 'big', amount: '0' }])).toThrow();
    expect(() => BetValidator.validate(sicBo, [{ type: 'big', amount: '999999999' }])).toThrow();
  });
});

describe('DiceEngine.roll', () => {
  it('is deterministic for a seed', () => {
    const bets: DiceBet[] = [{ type: 'big', amount: '10' }];
    const r1 = new DiceEngine(resolver.resolve('sic-bo'), 'seed-x').roll('r', bets);
    const r2 = new DiceEngine(resolver.resolve('sic-bo'), 'seed-x').roll('r', bets);
    expect(r1.values).toEqual(r2.values);
    expect(r1.settlement).toEqual(r2.settlement);
  });

  it('produces a coherent settled result', () => {
    const result = new DiceEngine(resolver.resolve('lucky-dice'), 'seed-a').roll('r', [
      { type: 'big', amount: '5' },
      { type: 'lucky-7', amount: '1' },
    ]);
    expect(result.mode).toBe('dice');
    expect(result.values).toHaveLength(2);
    expect(result.total).toBe(result.values[0]! + result.values[1]!);
    expect(result.verification.seed).toBe('seed-a');
  });

  it('proves a winning total settles at the configured payout', () => {
    const ruleset = resolver.resolve('sic-bo');
    let proven = false;
    for (let i = 0; i < 300 && !proven; i += 1) {
      const seed = `hit-${i}`;
      const { total } = ProvablyFairDiceRoller.verification(seed, 3, 6);
      if (total === 9) {
        const result = new DiceEngine(ruleset, seed).roll('r', [{ type: 'total-9', amount: '10' }]);
        expect(result.settlement.totalWin).toBe('70');
        proven = true;
      }
    }
    expect(proven).toBe(true);
  });

  it('handles many concurrent independent rolls', async () => {
    const ruleset = resolver.resolve('sic-bo');
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(new DiceEngine(ruleset, `c-${i}`).roll('r', [{ type: 'small', amount: '1' }])),
      ),
    );
    expect(results).toHaveLength(100);
    results.forEach((r) => {
      expect(r.total).toBeGreaterThanOrEqual(3);
      expect(r.total).toBeLessThanOrEqual(18);
    });
  });
});
