/**
 * @gaming-platform/crash-engine
 *
 * The production-grade, fully data-driven Crash Engine. A single reusable engine
 * powers every multiplier game (Crash, Instant Crash, Turbo, High-Multiplier and
 * volatility variants) through configuration and rule definitions — never
 * per-variant code.
 *
 * Adding a new crash-style game requires only a new variant preset (or an
 * admin-defined variant); the platform needs no changes.
 */

export * from './rules';
export * from './provably-fair';
export * from './multiplier';
export * from './bets';
export * from './round';
export * from './recording';
export * from './presets';
export * from './engine';
export * from './plugin';
