import { RuleResolver, type CrashGameRuleSet } from './rules';

/**
 * Built-in crash variants. Each entry is **pure configuration** mapping a
 * multiplier game to a distribution, curve speed and cash-out rules. Adding a
 * new crash-style game means adding a preset (or an admin-defined variant) —
 * never new engine code.
 */
export const CRASH_VARIANT_PRESETS: Record<string, Partial<CrashGameRuleSet>> = {
  crash: {
    key: 'crash',
    name: 'Crash',
    minMultiplier: 1.0,
    maxMultiplier: 1000,
    houseEdge: 0.01,
    volatility: 1.0,
    growthRatePerSecond: 0.07,
    tickMs: 100,
    bettingWindowMs: 5000,
  },
  'instant-crash': {
    key: 'instant-crash',
    name: 'Instant Crash',
    minMultiplier: 1.0,
    maxMultiplier: 1000,
    houseEdge: 0.01,
    volatility: 1.0,
    // Resolves immediately — no betting window, instant reveal.
    growthRatePerSecond: 5.0,
    tickMs: 50,
    bettingWindowMs: 0,
    allowManualCashout: false,
  },
  'turbo-crash': {
    key: 'turbo-crash',
    name: 'Turbo Crash',
    minMultiplier: 1.0,
    maxMultiplier: 1000,
    houseEdge: 0.01,
    volatility: 1.0,
    // Faster curve and shorter betting window for rapid rounds.
    growthRatePerSecond: 0.2,
    tickMs: 60,
    bettingWindowMs: 3000,
  },
  'high-multiplier': {
    key: 'high-multiplier',
    name: 'High Multiplier',
    minMultiplier: 1.0,
    maxMultiplier: 100000,
    houseEdge: 0.02,
    volatility: 1.3,
    growthRatePerSecond: 0.07,
    tickMs: 100,
    bettingWindowMs: 6000,
    maxPayout: 10000000,
  },
  'low-volatility': {
    key: 'low-volatility',
    name: 'Low Volatility',
    minMultiplier: 1.0,
    maxMultiplier: 50,
    houseEdge: 0.01,
    // Compressed tail — crashes cluster near low multipliers.
    volatility: 0.7,
    growthRatePerSecond: 0.05,
    tickMs: 100,
    bettingWindowMs: 5000,
  },
  'high-volatility': {
    key: 'high-volatility',
    name: 'High Volatility',
    minMultiplier: 1.0,
    maxMultiplier: 10000,
    houseEdge: 0.015,
    // Fat tail — rare but very high multipliers.
    volatility: 1.5,
    growthRatePerSecond: 0.08,
    tickMs: 100,
    bettingWindowMs: 5000,
  },
};

export const CRASH_VARIANT_KEYS = Object.keys(CRASH_VARIANT_PRESETS);
export const DEFAULT_CRASH_VARIANT = 'crash';

/**
 * Resolves a variant key into a complete, validated ruleset. Custom variants
 * (e.g. admin-defined) can be supplied via the `custom` map and take priority.
 */
export class VariantResolver {
  constructor(private readonly custom: Record<string, Partial<CrashGameRuleSet>> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in CRASH_VARIANT_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...CRASH_VARIANT_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string, overrides?: Partial<CrashGameRuleSet>): CrashGameRuleSet {
    const preset = this.custom[key] ?? CRASH_VARIANT_PRESETS[key];
    if (!preset) {
      throw new Error(`Unknown crash variant "${key}"`);
    }
    return RuleResolver.resolve(preset, overrides);
  }
}
