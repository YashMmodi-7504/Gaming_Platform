/**
 * Crash rule system. Every multiplier game is generated from a
 * {@link CrashGameRuleSet}; there is no per-variant code. Classic Crash, Instant
 * Crash, Turbo, High-Multiplier and volatility variants are all data.
 */

export interface TableLimits {
  /** Minimum stake per individual bet. */
  min: number;
  /** Maximum stake per individual bet. */
  max: number;
  /** Maximum combined stake across all bets in a round. */
  tableMax: number;
}

export interface CrashGameRuleSet {
  key: string;
  name: string;

  // Multiplier distribution
  /** Floor multiplier / instant-bust value (typically 1.00). */
  minMultiplier: number;
  /** Hard ceiling the curve and crash point are clamped to. */
  maxMultiplier: number;
  /** Instant-bust probability — the configured house edge (0..1). */
  houseEdge: number;
  /** Tail exponent: >1 fatter tail (more variance), <1 compressed. */
  volatility: number;

  // Curve / timing
  /** Continuous exponential growth rate per second of the multiplier. */
  growthRatePerSecond: number;
  /** Animation/settlement tick interval in ms. */
  tickMs: number;
  /** Safety cap on a single round's running time in ms. */
  roundDurationCapMs: number;
  /** Betting window length in ms before the curve starts. */
  bettingWindowMs: number;

  // Cash-out
  allowAutoCashout: boolean;
  allowManualCashout: boolean;

  // Limits
  /** Absolute cap on a single bet's returned amount. */
  maxPayout: number;
  limits: TableLimits;

  variantOf?: string;
}

/** Defaults for any new ruleset; presets override only what they need. */
export const DEFAULT_RULESET: CrashGameRuleSet = {
  key: 'generic-crash',
  name: 'Generic Crash',
  minMultiplier: 1.0,
  maxMultiplier: 1000,
  houseEdge: 0.01,
  volatility: 1.0,
  growthRatePerSecond: 0.07,
  tickMs: 100,
  roundDurationCapMs: 120000,
  bettingWindowMs: 5000,
  allowAutoCashout: true,
  allowManualCashout: true,
  maxPayout: 1000000,
  limits: { min: 1, max: 10000, tableMax: 50000 },
};

export class RuleValidationError extends Error {}

/**
 * Resolves a complete, validated ruleset from a base preset plus overrides — the
 * single entry point the engine and admin use to build a table from data.
 */
export const RuleResolver = {
  resolve(
    base: Partial<CrashGameRuleSet>,
    ...overrides: Array<Partial<CrashGameRuleSet> | undefined>
  ): CrashGameRuleSet {
    let merged: CrashGameRuleSet = { ...DEFAULT_RULESET, ...base };
    for (const override of overrides) {
      if (override) merged = { ...merged, ...override };
    }
    RuleResolver.validate(merged);
    return merged;
  },

  validate(ruleset: CrashGameRuleSet): void {
    if (!ruleset.key) throw new RuleValidationError('Ruleset requires a key');
    if (ruleset.minMultiplier < 1) throw new RuleValidationError('minMultiplier must be >= 1');
    if (ruleset.maxMultiplier <= ruleset.minMultiplier) {
      throw new RuleValidationError('maxMultiplier must exceed minMultiplier');
    }
    if (ruleset.houseEdge < 0 || ruleset.houseEdge >= 1) {
      throw new RuleValidationError('houseEdge must be in [0, 1)');
    }
    if (ruleset.volatility <= 0) throw new RuleValidationError('volatility must be > 0');
    if (ruleset.growthRatePerSecond <= 0) {
      throw new RuleValidationError('growthRatePerSecond must be > 0');
    }
    if (ruleset.tickMs < 10) throw new RuleValidationError('tickMs must be >= 10');
    if (ruleset.maxPayout <= 0) throw new RuleValidationError('maxPayout must be > 0');
    if (!ruleset.allowAutoCashout && !ruleset.allowManualCashout) {
      throw new RuleValidationError('At least one cash-out mode must be enabled');
    }
    const { min, max, tableMax } = ruleset.limits;
    if (min < 0 || max < min || tableMax < max) {
      throw new RuleValidationError('Invalid table limits');
    }
  },
};
