import { describe, expect, it } from 'vitest';

import { BetValidator, CashoutManager, PayoutCalculator } from './bets';
import { CrashEngine } from './engine';
import { CrashCurveGenerator, MultiplierManager } from './multiplier';
import { ProvablyFairCrashGenerator } from './provably-fair';
import { CRASH_VARIANT_KEYS, VariantResolver } from './presets';
import { RuleResolver, RuleValidationError } from './rules';

const resolver = new VariantResolver();

describe('provably-fair crash generator', () => {
  const ruleset = resolver.resolve('crash');

  it('generates crash points within configured bounds', () => {
    for (let i = 0; i < 500; i += 1) {
      const point = ProvablyFairCrashGenerator.fromRuleset(`seed-${i}`, ruleset);
      expect(point).toBeGreaterThanOrEqual(ruleset.minMultiplier);
      expect(point).toBeLessThanOrEqual(ruleset.maxMultiplier);
    }
  });

  it('is deterministic and verifiable for a seed', () => {
    const a = ProvablyFairCrashGenerator.verification('seed-1', ruleset);
    const b = ProvablyFairCrashGenerator.verification('seed-1', ruleset);
    expect(a.crashPoint).toBe(b.crashPoint);
    expect(ProvablyFairCrashGenerator.verify('seed-1', ruleset, a.crashPoint)).toBe(true);
    expect(ProvablyFairCrashGenerator.verify('seed-2', ruleset, a.crashPoint + 1000)).toBe(false);
  });

  it('busts instantly when the house edge triggers', () => {
    // A distribution whose edge covers the whole range always busts at the floor.
    const point = ProvablyFairCrashGenerator.crashPoint('edge', {
      minMultiplier: 1,
      maxMultiplier: 1000,
      houseEdge: 1,
      volatility: 1,
    });
    expect(point).toBe(1);
  });
});

describe('multiplier curve', () => {
  const ruleset = resolver.resolve('crash');
  const manager = new MultiplierManager(ruleset);

  it('rises monotonically from the floor', () => {
    expect(manager.valueAt(0)).toBe(ruleset.minMultiplier);
    expect(manager.valueAt(2000)).toBeGreaterThan(manager.valueAt(1000));
  });

  it('inverts time-to-reach consistently', () => {
    const t = manager.timeToReach(2);
    expect(manager.valueAt(t)).toBeGreaterThanOrEqual(1.99);
  });

  it('generates a bounded curve ending at the crash point', () => {
    const curve = CrashCurveGenerator.generate(ruleset, 5);
    expect(curve.points.length).toBeGreaterThan(0);
    expect(curve.points[curve.points.length - 1]!.multiplier).toBe(5);
  });
});

describe('rules', () => {
  it('resolves and validates every built-in variant', () => {
    for (const key of CRASH_VARIANT_KEYS) {
      const ruleset = resolver.resolve(key);
      expect(ruleset.key).toBe(key);
      expect(ruleset.maxMultiplier).toBeGreaterThan(ruleset.minMultiplier);
    }
  });

  it('rejects invalid rulesets', () => {
    expect(() => RuleResolver.resolve({ key: 'bad', houseEdge: 1 })).toThrow(RuleValidationError);
    expect(() => RuleResolver.resolve({ key: 'bad', minMultiplier: 0 })).toThrow(RuleValidationError);
    expect(() => RuleResolver.resolve({ key: 'bad', maxMultiplier: 1 })).toThrow(RuleValidationError);
  });
});

describe('cash-out & payouts', () => {
  const ruleset = resolver.resolve('crash');

  it('wins when the auto cash-out fires before the crash', () => {
    expect(CashoutManager.resolve(ruleset, { amount: '10', autoCashout: 2 }, 5)).toBe(2);
  });

  it('loses when the crash precedes the cash-out', () => {
    expect(CashoutManager.resolve(ruleset, { amount: '10', autoCashout: 5 }, 2)).toBeNull();
  });

  it('settles a winning auto cash-out at the configured multiplier', () => {
    const settlement = PayoutCalculator.settle(ruleset, [{ amount: '10', autoCashout: 2 }], 5);
    expect(settlement.totalWin).toBe('20');
    expect(settlement.bets[0]!.outcome).toBe('won');
  });

  it('caps payouts at the table maximum', () => {
    const capped = resolver.resolve('crash', { maxPayout: 50 });
    const settlement = PayoutCalculator.settle(capped, [{ amount: '10', autoCashout: 100 }], 500);
    expect(settlement.totalWin).toBe('50');
  });

  it('rejects unknown stakes and bad auto cash-outs', () => {
    expect(() => BetValidator.validate(ruleset, [{ amount: '0' }])).toThrow();
    expect(() => BetValidator.validate(ruleset, [{ amount: '999999999' }])).toThrow();
    expect(() => BetValidator.validate(ruleset, [{ amount: '10', autoCashout: 1 }])).toThrow();
  });
});

describe('CrashEngine.playRound', () => {
  it('is deterministic for a seed', () => {
    const r1 = new CrashEngine(resolver.resolve('crash'), 'seed-x').playRound('r', [
      { amount: '10', autoCashout: 2 },
    ]);
    const r2 = new CrashEngine(resolver.resolve('crash'), 'seed-x').playRound('r', [
      { amount: '10', autoCashout: 2 },
    ]);
    expect(r1.crashPoint).toBe(r2.crashPoint);
    expect(r1.settlement).toEqual(r2.settlement);
  });

  it('produces a coherent settled result with a curve', () => {
    const result = new CrashEngine(resolver.resolve('crash'), 'seed-a').playRound('r', [
      { amount: '5', autoCashout: 1.5 },
    ]);
    expect(result.mode).toBe('crash');
    expect(result.crashPoint).toBeGreaterThanOrEqual(1);
    expect(result.curve.points.length).toBeGreaterThan(0);
    expect(result.verification.seed).toBe('seed-a');
  });

  it('settles a manual cash-out below the crash point', () => {
    const ruleset = resolver.resolve('crash');
    let proven = false;
    for (let i = 0; i < 200 && !proven; i += 1) {
      const seed = `cp-${i}`;
      const crashPoint = ProvablyFairCrashGenerator.fromRuleset(seed, ruleset);
      if (crashPoint > 3) {
        const result = new CrashEngine(ruleset, seed).playRound('r', [{ amount: '10' }], [2]);
        expect(result.settlement.totalWin).toBe('20');
        proven = true;
      }
    }
    expect(proven).toBe(true);
  });

  it('handles many concurrent independent rounds', async () => {
    const ruleset = resolver.resolve('crash');
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(new CrashEngine(ruleset, `c-${i}`).playRound('r', [{ amount: '1', autoCashout: 2 }])),
      ),
    );
    expect(results).toHaveLength(100);
    results.forEach((r) => {
      expect(r.crashPoint).toBeGreaterThanOrEqual(1);
      expect(r.crashPoint).toBeLessThanOrEqual(ruleset.maxMultiplier);
    });
  });
});
