/**
 * @gaming-platform/roulette-engine
 *
 * The production-grade, fully data-driven Roulette Engine. A single reusable
 * engine powers every roulette variant (European, American, French, single-zero,
 * double-zero and bespoke casino layouts) through configuration and rule
 * definitions — never per-variant code.
 *
 * Adding a new roulette game requires only a new variant preset (or an
 * admin-defined variant); the platform needs no changes.
 */

export * from './rules';
export * from './wheel';
export * from './provably-fair';
export * from './bets';
export * from './round';
export * from './recording';
export * from './presets';
export * from './engine';
export * from './plugin';
