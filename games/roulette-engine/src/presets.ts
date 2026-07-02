import {
  AMERICAN_LAYOUT,
  EUROPEAN_LAYOUT,
  RuleResolver,
  STANDARD_BET_TYPES,
  type RouletteRuleSet,
} from './rules';

/**
 * Built-in roulette variants. Each entry is **pure configuration** mapping a
 * table to a wheel layout, bet board and house rules. Adding a new roulette game
 * means adding a preset (or an admin-defined variant) — never new engine code.
 */
export const ROULETTE_VARIANT_PRESETS: Record<string, Partial<RouletteRuleSet>> = {
  european: {
    key: 'european',
    name: 'European Roulette',
    layout: EUROPEAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    houseRules: { laPartage: false, enPrison: false },
  },
  american: {
    key: 'american',
    name: 'American Roulette',
    layout: AMERICAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    houseRules: { laPartage: false, enPrison: false },
  },
  french: {
    key: 'french',
    name: 'French Roulette',
    layout: EUROPEAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    // La Partage halves the house edge on even-money bets when zero hits.
    houseRules: { laPartage: true, enPrison: false },
  },
  'single-zero': {
    key: 'single-zero',
    name: 'Single Zero Roulette',
    layout: EUROPEAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    houseRules: { laPartage: false, enPrison: false },
  },
  'double-zero': {
    key: 'double-zero',
    name: 'Double Zero Roulette',
    layout: AMERICAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    houseRules: { laPartage: false, enPrison: false },
  },
  'french-en-prison': {
    key: 'french-en-prison',
    name: 'French Roulette (En Prison)',
    layout: EUROPEAN_LAYOUT,
    betTypes: STANDARD_BET_TYPES,
    houseRules: { laPartage: false, enPrison: true },
    variantOf: 'french',
  },
};

export const ROULETTE_VARIANT_KEYS = Object.keys(ROULETTE_VARIANT_PRESETS);
export const DEFAULT_ROULETTE_VARIANT = 'european';

/**
 * Resolves a variant key into a complete, validated ruleset. Custom variants
 * (e.g. admin-defined) can be supplied via the `custom` map and take priority.
 */
export class VariantResolver {
  constructor(private readonly custom: Record<string, Partial<RouletteRuleSet>> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in ROULETTE_VARIANT_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...ROULETTE_VARIANT_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string, overrides?: Partial<RouletteRuleSet>): RouletteRuleSet {
    const preset = this.custom[key] ?? ROULETTE_VARIANT_PRESETS[key];
    if (!preset) {
      throw new Error(`Unknown roulette variant "${key}"`);
    }
    return RuleResolver.resolve(preset, overrides);
  }
}
