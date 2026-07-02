/**
 * Tournament domain vocabulary. Every tournament, prize structure and mission is
 * data-driven — formats and distributions are selected by configuration, never
 * by per-tournament code.
 */

export type TournamentFormat =
  | 'single-elimination'
  | 'double-elimination'
  | 'swiss'
  | 'round-robin'
  | 'knockout'
  | 'timed'
  | 'leaderboard';

export type TournamentStatus =
  | 'draft'
  | 'scheduled'
  | 'registration'
  | 'checkin'
  | 'live'
  | 'completed'
  | 'cancelled';

export type RegistrationMode = 'open' | 'invite' | 'password' | 'private';

export type Cadence = 'one-off' | 'daily' | 'weekly' | 'monthly' | 'season';

export type PrizeDistributionType =
  | 'winner-take-all'
  | 'top-n'
  | 'percentage'
  | 'fixed'
  | 'even-split';

export type MatchState = 'pending' | 'ready' | 'live' | 'completed' | 'bye';

export interface Participant {
  id: string;
  userId: string;
  displayName: string;
  /** Optional seeding rating (higher = stronger). */
  rating?: number;
  seed?: number;
  checkedIn: boolean;
  status: 'registered' | 'waitlisted' | 'active' | 'eliminated' | 'withdrawn';
  /** Accumulated score for leaderboard/swiss/round-robin formats. */
  score: number;
}

export interface MatchSlot {
  participantId: string | null;
  /** Source: where this slot's participant comes from (for bracket wiring). */
  sourceMatchId?: string;
  score?: number;
}

export interface Match {
  id: string;
  round: number;
  /** Position within the round (0-based). */
  position: number;
  /** `winners` | `losers` | `final` for double elimination; `main` otherwise. */
  bracket: 'main' | 'winners' | 'losers' | 'final';
  state: MatchState;
  slots: [MatchSlot, MatchSlot];
  winnerId: string | null;
  loserId: string | null;
  /** Where the winner / loser advance to. */
  winnerTo?: { matchId: string; slot: 0 | 1 };
  loserTo?: { matchId: string; slot: 0 | 1 };
}

export interface Bracket {
  format: TournamentFormat;
  rounds: number;
  matches: Match[];
}

export interface PrizeTier {
  /** Inclusive rank range this tier applies to. */
  fromRank: number;
  toRank: number;
  /** For `percentage`: share of pool (0..1). For `fixed`: absolute amount. */
  value: number;
  /** Optional non-cash reward slugs (badges, free spins, etc.). */
  rewardSlugs?: string[];
}

export interface PrizeConfig {
  type: PrizeDistributionType;
  /** Currency for cash prizes (null for reward-only). */
  currencyId: string | null;
  /** Base/guaranteed pool. */
  guaranteed: string;
  /** Dynamic pool grows by this share of each entry fee (0..1). */
  entryContribution: number;
  tiers: PrizeTier[];
}

export interface Award {
  rank: number;
  participantId: string;
  userId: string;
  amount: string;
  rewardSlugs: string[];
}
