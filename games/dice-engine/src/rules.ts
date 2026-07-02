/**
 * Dice rule system. Every dice game is generated from a {@link DiceGameRuleSet};
 * there is no per-variant code. Sic Bo, Lucky Dice, Hi-Lo and bespoke multi-dice
 * games are all expressed as data.
 */

export type BetCategory = 'total' | 'range' | 'parity' | 'pattern' | 'face' | 'combo';

/**
 * How a bet's win condition is evaluated against a roll. Each strategy reads the
 * bet's parameters plus the ruleset — no per-game branches.
 */
export type BetMatch =
  | 'total' // sum equals one of `values`
  | 'total-range' // sum within [params.min, params.max]
  | 'big' // sum in the upper half (excludes triples by house rule)
  | 'small' // sum in the lower half (excludes triples by house rule)
  | 'odd' // sum is odd
  | 'even' // sum is even
  | 'any-triple' // all dice equal
  | 'specific-triple' // all dice equal `values[0]`
  | 'any-double' // at least two dice equal
  | 'specific-double' // at least two dice equal `values[0]`
  | 'single' // a chosen face appears (pays per occurrence)
  | 'combination'; // two specific faces both appear (`values` length 2)

export interface BetDefinition {
  /** Stable key referenced by placed bets and results (e.g. `big`, `triple-3`). */
  key: string;
  label: string;
  category: BetCategory;
  match: BetMatch;
  /** Total return multiplier including stake (2 = even money). */
  payout: number;
  /** Parameters for the match strategy (totals, faces, triple value, …). */
  values?: number[];
  /** For `single` bets — multiplies payout by the number of matching dice. */
  perOccurrence?: boolean;
  description?: string;
}

export interface TableLimits {
  /** Minimum stake per individual bet. */
  min: number;
  /** Maximum stake per individual bet. */
  max: number;
  /** Maximum combined stake across all bets in a round. */
  tableMax: number;
}

export interface HouseRules {
  /** Big/Small lose when a triple is rolled (standard Sic Bo). */
  triplesBeatBigSmall: boolean;
  /** Odd/Even lose when a triple is rolled (standard Sic Bo). */
  triplesBeatOddEven: boolean;
}

export interface DiceGameRuleSet {
  key: string;
  name: string;

  // Dice configuration
  diceCount: number;
  faces: number;

  // Betting board
  bets: BetDefinition[];
  limits: TableLimits;

  // Flow & rules
  roundTimerMs: number;
  houseRules: HouseRules;

  variantOf?: string;
}

/** Defaults for any new ruleset; presets override only what they need. */
export const DEFAULT_RULESET: DiceGameRuleSet = {
  key: 'generic-dice',
  name: 'Generic Dice',
  diceCount: 2,
  faces: 6,
  bets: [
    { key: 'big', label: 'Big', category: 'range', match: 'big', payout: 2 },
    { key: 'small', label: 'Small', category: 'range', match: 'small', payout: 2 },
  ],
  limits: { min: 1, max: 10000, tableMax: 50000 },
  roundTimerMs: 15000,
  houseRules: { triplesBeatBigSmall: true, triplesBeatOddEven: true },
};

export class RuleValidationError extends Error {}

/** Smallest and largest achievable sums for a dice configuration. */
export function totalBounds(ruleset: Pick<DiceGameRuleSet, 'diceCount' | 'faces'>): {
  min: number;
  max: number;
} {
  return { min: ruleset.diceCount, max: ruleset.diceCount * ruleset.faces };
}

/**
 * Resolves a complete, validated ruleset from a base preset plus overrides — the
 * single entry point the engine and admin use to build a table from data.
 */
export const RuleResolver = {
  resolve(
    base: Partial<DiceGameRuleSet>,
    ...overrides: Array<Partial<DiceGameRuleSet> | undefined>
  ): DiceGameRuleSet {
    let merged: DiceGameRuleSet = { ...DEFAULT_RULESET, ...base };
    for (const override of overrides) {
      if (override) merged = { ...merged, ...override };
    }
    RuleResolver.validate(merged);
    return merged;
  },

  validate(ruleset: DiceGameRuleSet): void {
    if (!ruleset.key) throw new RuleValidationError('Ruleset requires a key');
    if (ruleset.diceCount < 1) throw new RuleValidationError('diceCount must be >= 1');
    if (ruleset.faces < 2) throw new RuleValidationError('faces must be >= 2');
    if (ruleset.bets.length === 0) throw new RuleValidationError('At least one bet is required');

    const { min: lo, max: hi } = totalBounds(ruleset);
    for (const bet of ruleset.bets) {
      if (!bet.key) throw new RuleValidationError('Each bet requires a key');
      if (bet.payout <= 1) throw new RuleValidationError(`Bet "${bet.key}" requires payout > 1`);
      if (bet.match === 'total') {
        if (!bet.values || bet.values.length === 0) {
          throw new RuleValidationError(`Bet "${bet.key}" (total) requires values`);
        }
        for (const v of bet.values) {
          if (v < lo || v > hi) {
            throw new RuleValidationError(`Bet "${bet.key}" total ${v} is out of range ${lo}-${hi}`);
          }
        }
      }
      if (
        (bet.match === 'specific-triple' ||
          bet.match === 'specific-double' ||
          bet.match === 'single') &&
        (!bet.values || bet.values.length < 1)
      ) {
        throw new RuleValidationError(`Bet "${bet.key}" requires a face value`);
      }
      if (bet.match === 'combination' && (!bet.values || bet.values.length !== 2)) {
        throw new RuleValidationError(`Bet "${bet.key}" (combination) requires exactly 2 faces`);
      }
    }
    const { min, max, tableMax } = ruleset.limits;
    if (min < 0 || max < min || tableMax < max) {
      throw new RuleValidationError('Invalid table limits');
    }
  },

  /** Look up a bet definition by key. */
  bet(ruleset: DiceGameRuleSet, key: string): BetDefinition | undefined {
    return ruleset.bets.find((b) => b.key === key);
  },

  /** Quick lookup of a bet's payout multiplier. */
  payoutFor(ruleset: DiceGameRuleSet, key: string): number {
    return RuleResolver.bet(ruleset, key)?.payout ?? 0;
  },
};
