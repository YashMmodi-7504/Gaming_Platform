/**
 * Sportsbook rule profiles. These configure betting limits and behaviour; they
 * are data-driven variants (standard, high-roller, conservative, …) resolved the
 * same way as the other engines' rule sets.
 */

export interface SportsRuleSet {
  key: string;
  name: string;
  /** Minimum stake per bet slip. */
  minStake: number;
  /** Maximum stake per bet slip. */
  maxStake: number;
  /** Maximum combined payout per slip. */
  maxPayout: number;
  /** Maximum legs in an accumulator. */
  maxSelections: number;
  /** Minimum acceptable decimal odds per leg. */
  minOdds: number;
  /** Maximum acceptable decimal odds per leg. */
  maxOdds: number;
  /** Allow system bets (combinations of legs). */
  allowSystem: boolean;
  /** Allow accumulators (multi-leg parlays). */
  allowAccumulator: boolean;
}

export const DEFAULT_RULESET: SportsRuleSet = {
  key: 'standard',
  name: 'Standard',
  minStake: 1,
  maxStake: 10000,
  maxPayout: 1000000,
  maxSelections: 12,
  minOdds: 1.01,
  maxOdds: 1001,
  allowSystem: true,
  allowAccumulator: true,
};

export const SPORTS_RULE_PRESETS: Record<string, Partial<SportsRuleSet>> = {
  standard: { key: 'standard', name: 'Standard' },
  'high-roller': {
    key: 'high-roller',
    name: 'High Roller',
    minStake: 100,
    maxStake: 500000,
    maxPayout: 20000000,
    maxSelections: 20,
  },
  conservative: {
    key: 'conservative',
    name: 'Conservative',
    maxStake: 2000,
    maxPayout: 100000,
    maxSelections: 6,
    maxOdds: 201,
    allowSystem: false,
  },
};

export const SPORTS_RULE_KEYS = Object.keys(SPORTS_RULE_PRESETS);
export const DEFAULT_SPORTS_RULE = 'standard';

export class RuleValidationError extends Error {}

export const RuleResolver = {
  resolve(
    base: Partial<SportsRuleSet>,
    ...overrides: Array<Partial<SportsRuleSet> | undefined>
  ): SportsRuleSet {
    let merged: SportsRuleSet = { ...DEFAULT_RULESET, ...base };
    for (const override of overrides) {
      if (override) merged = { ...merged, ...override };
    }
    RuleResolver.validate(merged);
    return merged;
  },

  validate(ruleset: SportsRuleSet): void {
    if (!ruleset.key) throw new RuleValidationError('Ruleset requires a key');
    if (ruleset.minStake < 0 || ruleset.maxStake < ruleset.minStake) {
      throw new RuleValidationError('Invalid stake limits');
    }
    if (ruleset.maxPayout <= 0) throw new RuleValidationError('maxPayout must be > 0');
    if (ruleset.maxSelections < 1) throw new RuleValidationError('maxSelections must be >= 1');
    if (ruleset.minOdds < 1 || ruleset.maxOdds < ruleset.minOdds) {
      throw new RuleValidationError('Invalid odds bounds');
    }
  },
};

/** Resolves a rule profile key into a complete, validated ruleset. */
export class VariantResolver {
  constructor(private readonly custom: Record<string, Partial<SportsRuleSet>> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in SPORTS_RULE_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...SPORTS_RULE_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string, overrides?: Partial<SportsRuleSet>): SportsRuleSet {
    const preset = this.custom[key] ?? SPORTS_RULE_PRESETS[key];
    if (!preset) throw new Error(`Unknown sports rule profile "${key}"`);
    return RuleResolver.resolve(preset, overrides);
  }
}
