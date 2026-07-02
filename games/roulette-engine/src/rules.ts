/**
 * Roulette rule system. Every table is generated from a {@link RouletteRuleSet};
 * there is no per-variant code. European, American, French, single-zero,
 * double-zero and bespoke casino layouts are all expressed as data.
 */

export type RouletteColor = 'red' | 'black' | 'green';

export type BetCategory = 'inside' | 'outside';

/**
 * How a bet's covered numbers are derived. `numbers` uses the explicit player
 * selection (straight/split/street/corner/six-line); the rest are computed from
 * the wheel layout so outside bets never need hardcoding.
 */
export type BetMatch =
  | 'numbers'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'
  | 'dozen'
  | 'column';

export interface BetTypeDefinition {
  /** Stable key referenced by placed bets and results (e.g. `straight`, `red`). */
  key: string;
  label: string;
  category: BetCategory;
  match: BetMatch;
  /** Total return multiplier including stake (straight = 36 ⇒ 35:1). */
  payout: number;
  /** Required selection size for `numbers` bets (1,2,3,4,6); ignored otherwise. */
  selectionSize?: number;
  description?: string;
}

/**
 * Pure description of a physical wheel. `00` is encoded as the number 37 so the
 * sequence stays a numeric ring suitable for deterministic indexing.
 */
export interface WheelLayout {
  /** Ordered pocket numbers around the ring, including zero(es). */
  sequence: number[];
  /** Numbers painted red; remaining 1..maxNumber are black; zeros are green. */
  redNumbers: number[];
  /** Green pockets: `[0]` (single zero) or `[0, 37]` (single + double zero). */
  greenPockets: number[];
  maxNumber: number;
  dozenSize: number;
  columnStride: number;
  lowRange: [number, number];
  highRange: [number, number];
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
  /**
   * La Partage — even-money outside bets are returned half their stake when the
   * ball lands on a green pocket. Halves the zero house edge.
   */
  laPartage: boolean;
  /**
   * En Prison — even-money outside bets are imprisoned on a green pocket. In a
   * single-round settlement this is mathematically equivalent to La Partage
   * (identical expected value), so it resolves to the same half-stake return.
   */
  enPrison: boolean;
}

export interface RouletteRuleSet {
  key: string;
  name: string;
  layout: WheelLayout;
  betTypes: BetTypeDefinition[];
  limits: TableLimits;
  roundTimerMs: number;
  houseRules: HouseRules;
  variantOf?: string;
}

/** Standard European-wheel pocket ring (single zero, 37 pockets). */
export const EUROPEAN_SEQUENCE: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/** Standard American-wheel pocket ring (double zero, 38 pockets; 37 ⇒ `00`). */
export const AMERICAN_SEQUENCE: number[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8,
  19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

/** Numbers painted red on a standard wheel (identical for EU/US). */
export const RED_NUMBERS: number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

/** The complete standard bet board — reused by every variant via config. */
export const STANDARD_BET_TYPES: BetTypeDefinition[] = [
  { key: 'straight', label: 'Straight Up', category: 'inside', match: 'numbers', payout: 36, selectionSize: 1 },
  { key: 'split', label: 'Split', category: 'inside', match: 'numbers', payout: 18, selectionSize: 2 },
  { key: 'street', label: 'Street', category: 'inside', match: 'numbers', payout: 12, selectionSize: 3 },
  { key: 'corner', label: 'Corner', category: 'inside', match: 'numbers', payout: 9, selectionSize: 4 },
  { key: 'six-line', label: 'Six Line', category: 'inside', match: 'numbers', payout: 6, selectionSize: 6 },
  { key: 'column', label: 'Column', category: 'outside', match: 'column', payout: 3 },
  { key: 'dozen', label: 'Dozen', category: 'outside', match: 'dozen', payout: 3 },
  { key: 'red', label: 'Red', category: 'outside', match: 'red', payout: 2 },
  { key: 'black', label: 'Black', category: 'outside', match: 'black', payout: 2 },
  { key: 'odd', label: 'Odd', category: 'outside', match: 'odd', payout: 2 },
  { key: 'even', label: 'Even', category: 'outside', match: 'even', payout: 2 },
  { key: 'low', label: '1 to 18', category: 'outside', match: 'low', payout: 2 },
  { key: 'high', label: '19 to 36', category: 'outside', match: 'high', payout: 2 },
];

export const EUROPEAN_LAYOUT: WheelLayout = {
  sequence: EUROPEAN_SEQUENCE,
  redNumbers: RED_NUMBERS,
  greenPockets: [0],
  maxNumber: 36,
  dozenSize: 12,
  columnStride: 3,
  lowRange: [1, 18],
  highRange: [19, 36],
};

export const AMERICAN_LAYOUT: WheelLayout = {
  ...EUROPEAN_LAYOUT,
  sequence: AMERICAN_SEQUENCE,
  greenPockets: [0, 37],
};

/** Defaults for any new ruleset; presets override only what they need. */
export const DEFAULT_RULESET: RouletteRuleSet = {
  key: 'generic-roulette',
  name: 'Generic Roulette',
  layout: EUROPEAN_LAYOUT,
  betTypes: STANDARD_BET_TYPES,
  limits: { min: 1, max: 10000, tableMax: 50000 },
  roundTimerMs: 20000,
  houseRules: { laPartage: false, enPrison: false },
};

export class RuleValidationError extends Error {}

/**
 * Resolves a complete, validated ruleset from a base preset plus overrides — the
 * single entry point the engine and admin use to build a table from data.
 */
export const RuleResolver = {
  resolve(
    base: Partial<RouletteRuleSet>,
    ...overrides: Array<Partial<RouletteRuleSet> | undefined>
  ): RouletteRuleSet {
    let merged: RouletteRuleSet = { ...DEFAULT_RULESET, ...base };
    for (const override of overrides) {
      if (override) merged = { ...merged, ...override };
    }
    RuleResolver.validate(merged);
    return merged;
  },

  validate(ruleset: RouletteRuleSet): void {
    const { layout } = ruleset;
    if (!ruleset.key) throw new RuleValidationError('Ruleset requires a key');
    if (!layout || layout.sequence.length === 0) {
      throw new RuleValidationError('Wheel layout requires a non-empty pocket sequence');
    }
    if (new Set(layout.sequence).size !== layout.sequence.length) {
      throw new RuleValidationError('Wheel sequence must not contain duplicate pockets');
    }
    if (layout.maxNumber < 1) throw new RuleValidationError('maxNumber must be >= 1');
    if (layout.columnStride < 1) throw new RuleValidationError('columnStride must be >= 1');
    if (layout.dozenSize < 1) throw new RuleValidationError('dozenSize must be >= 1');
    for (const green of layout.greenPockets) {
      if (!layout.sequence.includes(green)) {
        throw new RuleValidationError(`Green pocket ${green} is not on the wheel`);
      }
    }
    if (ruleset.betTypes.length === 0) {
      throw new RuleValidationError('At least one bet type is required');
    }
    for (const bet of ruleset.betTypes) {
      if (!bet.key) throw new RuleValidationError('Each bet type requires a key');
      if (bet.payout <= 1) throw new RuleValidationError(`Bet "${bet.key}" requires payout > 1`);
      if (bet.match === 'numbers' && (!bet.selectionSize || bet.selectionSize < 1)) {
        throw new RuleValidationError(`Bet "${bet.key}" requires a positive selectionSize`);
      }
    }
    const { min, max, tableMax } = ruleset.limits;
    if (min < 0 || max < min || tableMax < max) {
      throw new RuleValidationError('Invalid table limits');
    }
  },

  /** Look up a bet type definition by key. */
  betType(ruleset: RouletteRuleSet, key: string): BetTypeDefinition | undefined {
    return ruleset.betTypes.find((b) => b.key === key);
  },

  /** Quick lookup of a bet type's payout multiplier. */
  payoutFor(ruleset: RouletteRuleSet, key: string): number {
    return RuleResolver.betType(ruleset, key)?.payout ?? 0;
  },
};
