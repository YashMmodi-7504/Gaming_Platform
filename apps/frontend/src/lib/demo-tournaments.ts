/**
 * Deterministic demo tournaments so the tournaments list is never empty in demo
 * mode. Shapes match `TournamentSummary`; no `Date.now()`/`Math.random()`.
 * Backend-free, presentation only.
 */

import type { TournamentSummary } from './tournament-api';

function t(
  id: string,
  name: string,
  status: string,
  format: string,
  cadence: string,
  capacity: number,
  registered: number,
  entryFee: string,
  prizePool: string,
): TournamentSummary {
  return { id, name, status, format, cadence, capacity, registered, entryFee, prizePool, startsAt: null };
}

const ALL: TournamentSummary[] = [
  // Registration
  t('demo-weekend-showdown', 'Weekend Showdown', 'registration', 'single-elimination', 'weekly', 512, 348, '25', '$1,000,000'),
  t('demo-crash-masters', 'Crash Masters', 'registration', 'leaderboard', 'daily', 256, 190, '10', '$250,000'),
  t('demo-rookie-rumble', 'Rookie Rumble', 'registration', 'swiss', 'weekly', 128, 61, '0', '$50,000'),
  t('demo-blackjack-battle', 'Blackjack Battle', 'registration', 'knockout', 'weekly', 256, 142, '15', '$180,000'),
  // Live
  t('demo-high-roller-cup', 'High Roller Cup', 'live', 'single-elimination', 'monthly', 128, 128, '500', '$2,500,000'),
  t('demo-dice-duel', 'Dice Duel', 'live', 'double-elimination', 'daily', 64, 64, '5', '$40,000'),
  t('demo-roulette-royale', 'Roulette Royale', 'live', 'leaderboard', 'weekly', 512, 512, '20', '$500,000'),
  t('demo-midnight-masters', 'Midnight Masters', 'live', 'timed', 'daily', 256, 231, '10', '$120,000'),
  // Completed
  t('demo-champions-league', 'Champions League', 'completed', 'single-elimination', 'season', 1024, 1024, '100', '$5,000,000'),
  t('demo-spring-classic', 'Spring Classic', 'completed', 'swiss', 'monthly', 256, 256, '25', '$300,000'),
  t('demo-neon-cup', 'Neon Cup', 'completed', 'knockout', 'weekly', 128, 128, '10', '$75,000'),
  t('demo-galaxy-open', 'Galaxy Open', 'completed', 'round-robin', 'monthly', 64, 64, '50', '$220,000'),
];

/** The headline featured tournament (a live, high-prize event). */
export const FEATURED_TOURNAMENT: TournamentSummary = ALL.find((x) => x.id === 'demo-high-roller-cup')!;

/** Demo tournaments filtered by status/tab. */
export function demoTournaments(status?: string): TournamentSummary[] {
  if (!status) return ALL;
  return ALL.filter((x) => x.status === status);
}
