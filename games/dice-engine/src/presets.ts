import { RuleResolver, type BetDefinition, type DiceGameRuleSet } from './rules';

/** Standard Sic Bo single-number bets (1-6), each paying per matching die. */
const SIC_BO_SINGLES: BetDefinition[] = Array.from({ length: 6 }, (_, i) => ({
  key: `single-${i + 1}`,
  label: `Single ${i + 1}`,
  category: 'face',
  match: 'single',
  payout: 2,
  values: [i + 1],
  perOccurrence: true,
}));

/** Specific-triple bets (1-6) for Sic Bo, paying 180:1 (181x total). */
const SIC_BO_TRIPLES: BetDefinition[] = Array.from({ length: 6 }, (_, i) => ({
  key: `triple-${i + 1}`,
  label: `Triple ${i + 1}`,
  category: 'pattern',
  match: 'specific-triple',
  payout: 181,
  values: [i + 1],
}));

/** Specific-double bets (1-6) for Sic Bo, paying 10:1 (11x total). */
const SIC_BO_DOUBLES: BetDefinition[] = Array.from({ length: 6 }, (_, i) => ({
  key: `double-${i + 1}`,
  label: `Double ${i + 1}`,
  category: 'pattern',
  match: 'specific-double',
  payout: 11,
  values: [i + 1],
}));

/** Specific-total bets (4-17) for Sic Bo with standard total payouts. */
const SIC_BO_TOTAL_PAYOUTS: Record<number, number> = {
  4: 61,
  5: 31,
  6: 19,
  7: 13,
  8: 9,
  9: 7,
  10: 7,
  11: 7,
  12: 7,
  13: 9,
  14: 13,
  15: 19,
  16: 31,
  17: 61,
};
const SIC_BO_TOTALS: BetDefinition[] = Object.entries(SIC_BO_TOTAL_PAYOUTS).map(([total, payout]) => ({
  key: `total-${total}`,
  label: `Total ${total}`,
  category: 'total',
  match: 'total',
  payout,
  values: [Number(total)],
}));

/**
 * Built-in dice variants. Each entry is **pure configuration** mapping a dice
 * game to dice counts, a bet board and house rules. Adding a new dice game means
 * adding a preset (or an admin-defined variant) — never new engine code.
 */
export const DICE_VARIANT_PRESETS: Record<string, Partial<DiceGameRuleSet>> = {
  'sic-bo': {
    key: 'sic-bo',
    name: 'Sic Bo',
    diceCount: 3,
    faces: 6,
    roundTimerMs: 20000,
    houseRules: { triplesBeatBigSmall: true, triplesBeatOddEven: true },
    bets: [
      { key: 'big', label: 'Big (11-17)', category: 'range', match: 'big', payout: 2 },
      { key: 'small', label: 'Small (4-10)', category: 'range', match: 'small', payout: 2 },
      { key: 'odd', label: 'Odd', category: 'parity', match: 'odd', payout: 2 },
      { key: 'even', label: 'Even', category: 'parity', match: 'even', payout: 2 },
      { key: 'any-triple', label: 'Any Triple', category: 'pattern', match: 'any-triple', payout: 31 },
      ...SIC_BO_TRIPLES,
      ...SIC_BO_DOUBLES,
      ...SIC_BO_SINGLES,
      ...SIC_BO_TOTALS,
    ],
  },
  'lucky-dice': {
    key: 'lucky-dice',
    name: 'Lucky Dice',
    diceCount: 2,
    faces: 6,
    roundTimerMs: 15000,
    houseRules: { triplesBeatBigSmall: false, triplesBeatOddEven: false },
    bets: [
      { key: 'big', label: 'Big', category: 'range', match: 'big', payout: 2 },
      { key: 'small', label: 'Small', category: 'range', match: 'small', payout: 2 },
      { key: 'odd', label: 'Odd', category: 'parity', match: 'odd', payout: 2 },
      { key: 'even', label: 'Even', category: 'parity', match: 'even', payout: 2 },
      { key: 'any-double', label: 'Any Double', category: 'pattern', match: 'any-double', payout: 6 },
      { key: 'lucky-7', label: 'Lucky 7', category: 'total', match: 'total', payout: 5, values: [7] },
      { key: 'snake-eyes', label: 'Snake Eyes (2)', category: 'total', match: 'total', payout: 30, values: [2] },
      { key: 'boxcars', label: 'Boxcars (12)', category: 'total', match: 'total', payout: 30, values: [12] },
      ...Array.from({ length: 6 }, (_, i) => ({
        key: `single-${i + 1}`,
        label: `Single ${i + 1}`,
        category: 'face' as const,
        match: 'single' as const,
        payout: 2,
        values: [i + 1],
        perOccurrence: true,
      })),
    ],
  },
  'hi-lo': {
    key: 'hi-lo',
    name: 'Hi-Lo Dice',
    diceCount: 1,
    faces: 6,
    roundTimerMs: 12000,
    houseRules: { triplesBeatBigSmall: false, triplesBeatOddEven: false },
    bets: [
      { key: 'hi', label: 'High (4-6)', category: 'range', match: 'big', payout: 2 },
      { key: 'lo', label: 'Low (1-3)', category: 'range', match: 'small', payout: 2 },
      { key: 'odd', label: 'Odd', category: 'parity', match: 'odd', payout: 2 },
      { key: 'even', label: 'Even', category: 'parity', match: 'even', payout: 2 },
      { key: 'seven', label: 'Lucky (6)', category: 'total', match: 'total', payout: 6, values: [6] },
      ...Array.from({ length: 6 }, (_, i) => ({
        key: `face-${i + 1}`,
        label: `Face ${i + 1}`,
        category: 'face' as const,
        match: 'single' as const,
        payout: 6,
        values: [i + 1],
      })),
    ],
  },
  'lucky-dice-deluxe': {
    key: 'lucky-dice-deluxe',
    name: 'Lucky Dice Deluxe (5 dice)',
    diceCount: 5,
    faces: 6,
    roundTimerMs: 20000,
    houseRules: { triplesBeatBigSmall: false, triplesBeatOddEven: false },
    bets: [
      { key: 'big', label: 'Big', category: 'range', match: 'big', payout: 2 },
      { key: 'small', label: 'Small', category: 'range', match: 'small', payout: 2 },
      { key: 'odd', label: 'Odd', category: 'parity', match: 'odd', payout: 2 },
      { key: 'even', label: 'Even', category: 'parity', match: 'even', payout: 2 },
      { key: 'any-triple', label: 'Any Triple', category: 'pattern', match: 'any-triple', payout: 8 },
      { key: 'any-double', label: 'Any Double', category: 'pattern', match: 'any-double', payout: 3 },
      { key: 'jackpot', label: 'Jackpot (range 15-18)', category: 'total', match: 'total-range', payout: 4, values: [15, 18] },
    ],
  },
};

export const DICE_VARIANT_KEYS = Object.keys(DICE_VARIANT_PRESETS);
export const DEFAULT_DICE_VARIANT = 'sic-bo';

/**
 * Resolves a variant key into a complete, validated ruleset. Custom variants
 * (e.g. admin-defined) can be supplied via the `custom` map and take priority.
 */
export class VariantResolver {
  constructor(private readonly custom: Record<string, Partial<DiceGameRuleSet>> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in DICE_VARIANT_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...DICE_VARIANT_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string, overrides?: Partial<DiceGameRuleSet>): DiceGameRuleSet {
    const preset = this.custom[key] ?? DICE_VARIANT_PRESETS[key];
    if (!preset) {
      throw new Error(`Unknown dice variant "${key}"`);
    }
    return RuleResolver.resolve(preset, overrides);
  }
}
