/**
 * @gaming-platform/dice-engine
 *
 * The production-grade, fully data-driven Dice Engine. A single reusable engine
 * powers every dice game (Sic Bo, Lucky Dice, Hi-Lo and bespoke multi-dice
 * games) through configuration and rule definitions — never per-variant code.
 *
 * Adding a new dice game requires only a new variant preset (or an admin-defined
 * variant); the platform needs no changes.
 */

export * from './rules';
export * from './dice';
export * from './provably-fair';
export * from './bets';
export * from './round';
export * from './recording';
export * from './presets';
export * from './engine';
export * from './plugin';
