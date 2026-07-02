/**
 * Sports betting domain types. Every sport, competition, match and market is
 * data — there is no hardcoded sport or competition. Market behaviour is driven
 * by a small set of generic settlement modes selected via configuration.
 */

export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'finished' | 'settled' | 'cancelled';
export type MarketStatus = 'open' | 'suspended' | 'closed' | 'settled';
export type SelectionStatus = 'open' | 'won' | 'lost' | 'void' | 'pending';
export type BetType = 'single' | 'accumulator' | 'system';
export type OddsFormat = 'decimal' | 'fractional' | 'american';

/**
 * Generic settlement strategies. Every market type maps to one of these plus
 * configuration — no per-market code lives in the engine.
 *
 * - `outright`: a selection wins if its id is in the market result's winners
 *   (covers match-winner, draw-no-bet, double-chance, correct-score, first/top
 *   scorer, race-winner, both-teams-to-score, …).
 * - `line`: numeric line markets — the result supplies a number compared against
 *   each selection's `line` and `side` (over/under or handicap, with push/void).
 */
export type SettlementMode = 'outright' | 'line';

export interface SportDefinition {
  key: string;
  name: string;
  /** Icon / category hint for the UI; purely presentational. */
  category: string;
  /** Market type keys available for this sport (from the market template set). */
  marketTypes: string[];
  /** Does the sport allow a draw outcome (football yes, tennis no)? */
  hasDraw: boolean;
  /** Participant noun ('team', 'player', 'horse', 'fighter'). */
  participantNoun: string;
}

export interface MarketTemplate {
  key: string;
  name: string;
  settlement: SettlementMode;
  /** Human description of the market. */
  description: string;
  /** Default selections generator hint; the catalog supplies actual selections. */
  selectionKind: 'participants' | 'binary' | 'scoreline' | 'line' | 'custom';
  /** For `line` markets: the comparison side is encoded per selection. */
  supportsLine: boolean;
  /** Whether a draw selection is added for participant markets. */
  includesDraw?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  /** Optional short code (e.g. 'IND', 'AUS'). */
  short?: string;
  /** 'home' | 'away' | 'neutral' for two-sided sports; free for races. */
  side?: 'home' | 'away' | 'neutral';
  /** Players belonging to a team (for player markets). */
  players?: Array<{ id: string; name: string }>;
}

export interface Selection {
  id: string;
  name: string;
  /** Decimal odds for this selection. */
  odds: number;
  status: SelectionStatus;
  /** For `line` markets: the numeric line (e.g. 2.5) and side. */
  line?: number;
  side?: 'over' | 'under' | 'home' | 'away';
}

export interface Market {
  id: string;
  /** Market template key (e.g. `match-winner`, `over-under`). */
  templateKey: string;
  name: string;
  settlement: SettlementMode;
  status: MarketStatus;
  selections: Selection[];
  /** For `line` markets, the headline line value (informational). */
  line?: number;
}

export interface Competition {
  key: string;
  sportKey: string;
  name: string;
  region: string;
  season?: string;
  tournament?: string;
}

export interface Match {
  id: string;
  competitionKey: string;
  sportKey: string;
  name: string;
  participants: Participant[];
  startTime: string;
  status: MatchStatus;
  markets: Market[];
  /** Settlement result feed (populated when finished). */
  result?: MatchResult;
}

/**
 * The result feed used to settle a match. `winners[marketId]` lists the winning
 * selection ids for outright markets; `lines[marketId]` gives the realised
 * numeric value for line markets; `voids` force selections to void.
 */
export interface MatchResult {
  winners: Record<string, string[]>;
  lines: Record<string, number>;
  voids: string[];
}

export interface BetSelection {
  matchId: string;
  marketId: string;
  selectionId: string;
  /** Odds captured at placement (price is locked on the slip). */
  odds: number;
  line?: number;
  side?: 'over' | 'under' | 'home' | 'away';
  status: SelectionStatus;
  /** Denormalised labels for display/history. */
  matchName?: string;
  marketName?: string;
  selectionName?: string;
}

export interface BetSlip {
  betId: string;
  userId?: string;
  /** Currency the stake is denominated in (real-money slips). */
  currencyId?: string;
  type: BetType;
  stake: string;
  selections: BetSelection[];
  /** Combined decimal odds (product for accumulators). */
  combinedOdds: number;
  potentialReturn: string;
  status: SelectionStatus;
  createdAt: number;
  settledAt?: number;
}
