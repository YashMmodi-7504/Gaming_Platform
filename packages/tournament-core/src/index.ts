/**
 * @gaming-platform/tournament-core
 *
 * The pure, deterministic domain core of the Enterprise Tournament platform:
 * bracket generation (single/double elimination, round-robin, Swiss, knockout),
 * seeding, exact prize-pool distribution, leaderboard ranking, missions /
 * achievements / streaks / XP-levels and the tournament lifecycle state machine.
 *
 * The backend `tournament` module mirrors these decisions onto Prisma, Redis,
 * Socket.IO and the Wallet Engine.
 */

export * from './types';
export * from './lifecycle';
export * from './seeding';
export * from './bracket';
export * from './prizes';
export * from './ranking';
export * from './missions';
export * from './engine';
