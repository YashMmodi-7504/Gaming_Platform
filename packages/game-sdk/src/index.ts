/**
 * @gaming-platform/game-sdk
 *
 * The Enterprise Game Runtime & Plugin Engine. Provides the reusable framework
 * every game plugs into: a lifecycle-driven runtime, a sandboxed plugin host,
 * deterministic RNG, and a full set of managers (state, events, assets, audio,
 * animation, statistics, replay, results, timers, config, localization, theme,
 * storage). Isomorphic — runs on the server (authoritative engines) and in the
 * browser (runtime harness).
 */

export * from './types';
export * from './rng';
export * from './lifecycle';
export * from './plugin';
export * from './registry';
export * from './runtime';
export * from './loader';

export * from './managers/event-bus';
export * from './managers/state-manager';
export * from './managers/timer-manager';
export * from './managers/statistics-manager';
export * from './managers/replay-manager';
export * from './managers/result-manager';
export * from './managers/config-resolver';
export * from './managers/localization';
export * from './managers/theme-manager';
export * from './managers/storage-manager';
export * from './managers/asset-manager';
export * from './managers/audio-manager';
export * from './managers/animation-manager';
