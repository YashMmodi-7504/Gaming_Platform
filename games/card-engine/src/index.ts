/**
 * @gaming-platform/card-engine
 *
 * The production-grade, fully data-driven Card Engine. A single reusable engine
 * powers every supported card game (Teen Patti family, Poker, Texas Hold'em,
 * Dragon Tiger, Baccarat, Blackjack, Casino War, Andar Bahar, Lucky 7, 32 Cards,
 * and more) through configuration and rule definitions — never per-game code.
 *
 * Adding a new card game requires only a new variant preset (or an admin-defined
 * variant); the platform needs no changes.
 */

export * from './card';
export * from './shuffle';
export * from './deck';
export * from './entities';
export * from './rules';
export * from './presets';
export * from './evaluator';
export * from './betting';
export * from './round';
export * from './recording';
export * from './engine';
export * from './plugin';
