/**
 * @gaming-platform/sports-engine
 *
 * The production-grade, fully data-driven Sports Betting Engine. A single
 * reusable engine powers every sport (football, cricket, tennis, basketball,
 * racing, esports and more) and every market type through configuration and a
 * small set of generic settlement modes — never per-sport or per-market code.
 *
 * Adding a new sport, competition, match or market requires only data (a new
 * definition / catalog entry); the platform needs no changes.
 */

export * from './types';
export * from './markets';
export * from './odds';
export * from './settlement';
export * from './rules';
export * from './betslip';
export * from './managers';
export * from './presets';
export * from './engine';
export * from './plugin';
