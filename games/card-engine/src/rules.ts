import type { Rank } from './card';

/**
 * Generic evaluation strategies. Every supported card game maps to one of these
 * reusable strategies plus configuration — no per-game code lives in the engine.
 */
export type EvaluationMode =
  | 'poker-rank' // best N-card poker hand; highest hand wins
  | 'high-card' // compare a single representative card per side
  | 'point-total' // baccarat-style modular totals, closest to target
  | 'blackjack' // 21 target with soft aces and bust
  | 'sum-points' // sum of face values; highest total wins
  | 'side-match' // deal until a rank matches; the landing side wins
  | 'over-under'; // single card compared to a target

export type TieRule = 'push' | 'split' | 'dealer' | 'tie-bet';
export type CardVisibility = 'all' | 'own' | 'dealer-hole';
export type DealerBehavior = 'none' | 'stand-on' | 'auto-best';

export interface BetDefinition {
  /** Stable bet key referenced by results and payouts (e.g. `player`, `tie`). */
  key: string;
  label: string;
  /** Total return multiplier including stake (2 = even money 1:1). */
  payout: number;
  description?: string;
}

export interface CardGameRuleSet {
  key: string;
  name: string;
  evaluationMode: EvaluationMode;

  // Deck
  decks: number;
  jokersPerDeck: number;
  wildRanks: Rank[];

  // Table shape
  playerCount: number;
  handSize: number;
  communityCards: number;
  sides: string[];

  // Evaluation parameters
  aceHigh: boolean;
  target: number;
  dealerBehavior: DealerBehavior;
  dealerStandValue: number;
  interactive: boolean;
  tieRule: TieRule;

  // Betting
  bets: BetDefinition[];
  sideBets: BetDefinition[];
  betLimits: { min: number; max: number };

  // Flow
  roundTimerMs: number;
  cardVisibility: CardVisibility;
  drawRules: { allowDraw: boolean; maxDraws: number };

  variantOf?: string;
}

/** Sensible defaults for any new ruleset; presets override what they need. */
export const DEFAULT_RULESET: CardGameRuleSet = {
  key: 'generic-card',
  name: 'Generic Card Game',
  evaluationMode: 'high-card',
  decks: 1,
  jokersPerDeck: 0,
  wildRanks: [],
  playerCount: 2,
  handSize: 1,
  communityCards: 0,
  sides: ['a', 'b'],
  aceHigh: true,
  target: 21,
  dealerBehavior: 'none',
  dealerStandValue: 17,
  interactive: false,
  tieRule: 'push',
  bets: [{ key: 'main', label: 'Main', payout: 2 }],
  sideBets: [],
  betLimits: { min: 1, max: 100000 },
  roundTimerMs: 15000,
  cardVisibility: 'all',
  drawRules: { allowDraw: false, maxDraws: 0 },
};

export class RuleValidationError extends Error {}

/**
 * Resolves a complete, validated ruleset from a base preset plus overrides.
 * This is the single entry point the engine and admin use to build rules.
 */
export const RuleResolver = {
  resolve(base: Partial<CardGameRuleSet>, ...overrides: Array<Partial<CardGameRuleSet> | undefined>): CardGameRuleSet {
    let merged: CardGameRuleSet = { ...DEFAULT_RULESET, ...base };
    for (const override of overrides) {
      if (override) merged = { ...merged, ...override };
    }
    RuleResolver.validate(merged);
    return merged;
  },

  validate(ruleset: CardGameRuleSet): void {
    if (!ruleset.key) throw new RuleValidationError('Ruleset requires a key');
    if (ruleset.decks < 1) throw new RuleValidationError('decks must be >= 1');
    if (ruleset.playerCount < 1) throw new RuleValidationError('playerCount must be >= 1');
    if (ruleset.handSize < 0) throw new RuleValidationError('handSize must be >= 0');
    if (ruleset.bets.length === 0) throw new RuleValidationError('At least one bet is required');
    if (ruleset.betLimits.min < 0 || ruleset.betLimits.max < ruleset.betLimits.min) {
      throw new RuleValidationError('Invalid bet limits');
    }
    for (const bet of [...ruleset.bets, ...ruleset.sideBets]) {
      if (!bet.key) throw new RuleValidationError('Each bet requires a key');
      if (bet.payout <= 0) throw new RuleValidationError(`Bet "${bet.key}" requires a positive payout`);
    }
  },

  /** Quick lookup of a bet's payout multiplier. */
  payoutFor(ruleset: CardGameRuleSet, betKey: string): number {
    const bet = [...ruleset.bets, ...ruleset.sideBets].find((b) => b.key === betKey);
    return bet?.payout ?? 0;
  },
};
