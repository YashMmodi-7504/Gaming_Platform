import type { GameConfig } from '../types';

export type ConfigValidator<T extends GameConfig> = (config: GameConfig) => T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merge `override` onto `base` (arrays and scalars replace, objects merge). */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Resolves the effective game configuration by layering operator/session
 * overrides on top of the plugin defaults, then optionally validating.
 */
export class GameConfigResolver<T extends GameConfig = GameConfig> {
  constructor(
    private readonly defaults: T,
    private readonly validator?: ConfigValidator<T>,
  ) {}

  resolve(...overrides: Array<Partial<GameConfig> | undefined>): T {
    let merged: T = { ...this.defaults };
    for (const override of overrides) {
      if (override) merged = deepMerge(merged, override);
    }
    return this.validator ? this.validator(merged) : merged;
  }
}
