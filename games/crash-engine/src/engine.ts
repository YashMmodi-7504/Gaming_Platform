import {
  BetValidator,
  PayoutCalculator,
  ResultEvaluator,
  type CrashBet,
  type CrashSettlement,
} from './bets';
import { CrashCurveGenerator, MultiplierManager, type CrashCurve } from './multiplier';
import { ProvablyFairCrashGenerator } from './provably-fair';
import type { CrashGameRuleSet } from './rules';

export interface CrashRoundResult {
  roundId: string;
  variant: string;
  mode: 'crash';
  crashPoint: number;
  crashTimeMs: number;
  /** Distinct cash-out multipliers that won this round. */
  cashouts: number[];
  /** True when the round busted at the floor (instant bust). */
  instantBust: boolean;
  settlement: CrashSettlement;
  /** Sampled multiplier curve for animation / replay. */
  curve: CrashCurve;
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

/**
 * The authoritative crash round engine. Constructed with a resolved ruleset and
 * a provably-fair seed, it derives a deterministic crash point and settles all
 * bets against it. The same seed always yields the same crash point — enabling
 * replay and verification.
 *
 * Fully data-driven: the distribution, curve speed, cash-out rules and limits
 * all come from the ruleset; there are no per-variant branches.
 */
export class CrashEngine {
  private readonly multiplier: MultiplierManager;

  constructor(
    readonly ruleset: CrashGameRuleSet,
    private readonly seed: string,
  ) {
    this.multiplier = new MultiplierManager(ruleset);
  }

  /** The deterministic crash point for this engine's seed. */
  crashPoint(): number {
    return ProvablyFairCrashGenerator.fromRuleset(this.seed, this.ruleset);
  }

  /** Multiplier value at an elapsed time (ms) on the curve. */
  multiplierAt(elapsedMs: number): number {
    return this.multiplier.valueAt(elapsedMs);
  }

  /**
   * Settle a round. `manualCashouts[i]` is the multiplier at which bet `i` was
   * manually taken (interactive play); omit for pure auto-resolve where only
   * each bet's `autoCashout` applies.
   */
  playRound(
    roundId: string,
    bets: CrashBet[],
    manualCashouts: Array<number | null> = [],
  ): CrashRoundResult {
    BetValidator.validate(this.ruleset, bets);

    const crashPoint = this.crashPoint();
    const curve = CrashCurveGenerator.generate(this.ruleset, crashPoint);
    const settlement = PayoutCalculator.settle(this.ruleset, bets, crashPoint, manualCashouts);
    const cashouts = [
      ...new Set(
        settlement.bets
          .filter((b) => b.outcome === 'won' && b.cashedOutAt !== null)
          .map((b) => b.cashedOutAt as number),
      ),
    ];

    return {
      roundId,
      variant: this.ruleset.key,
      mode: 'crash',
      crashPoint,
      crashTimeMs: curve.crashTimeMs,
      cashouts,
      instantBust: crashPoint <= this.ruleset.minMultiplier,
      settlement,
      curve,
      details: ResultEvaluator.describe(crashPoint),
      verification: { seed: this.seed },
    };
  }
}
