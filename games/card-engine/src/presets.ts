import { RuleResolver, type CardGameRuleSet } from './rules';

/**
 * Built-in card game variants. Each entry is **pure configuration** that maps a
 * game to a generic evaluation strategy. Adding a new game means adding a preset
 * (or an admin-defined variant) — never new engine code.
 */
export const CARD_VARIANT_PRESETS: Record<string, Partial<CardGameRuleSet>> = {
  'teen-patti': {
    key: 'teen-patti',
    name: 'Teen Patti',
    evaluationMode: 'poker-rank',
    handSize: 3,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    sideBets: [{ key: 'pair-plus', label: 'Pair Plus', payout: 2 }],
    tieRule: 'push',
  },
  'teen-patti-joker': {
    key: 'teen-patti-joker',
    name: 'Teen Patti Joker',
    evaluationMode: 'poker-rank',
    handSize: 3,
    jokersPerDeck: 2,
    wildRanks: ['JOKER'],
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    tieRule: 'push',
  },
  'teen-patti-20': {
    key: 'teen-patti-20',
    name: 'Teen Patti 20-20',
    evaluationMode: 'poker-rank',
    handSize: 3,
    playerCount: 2,
    roundTimerMs: 20000,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    tieRule: 'push',
  },
  'teen-patti-one-day': {
    key: 'teen-patti-one-day',
    name: 'Teen Patti One Day',
    evaluationMode: 'poker-rank',
    handSize: 3,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    sideBets: [
      { key: 'player-pair', label: 'Player Pair+', payout: 2 },
      { key: 'dealer-pair', label: 'Dealer Pair+', payout: 2 },
    ],
    tieRule: 'push',
  },
  poker: {
    key: 'poker',
    name: 'Poker',
    evaluationMode: 'poker-rank',
    handSize: 5,
    playerCount: 6,
    sides: ['player', 'dealer'],
    bets: [{ key: 'ante', label: 'Ante', payout: 2 }],
    tieRule: 'split',
  },
  'texas-holdem': {
    key: 'texas-holdem',
    name: "Texas Hold'em",
    evaluationMode: 'poker-rank',
    handSize: 2,
    communityCards: 5,
    playerCount: 6,
    sides: ['player', 'dealer'],
    bets: [{ key: 'ante', label: 'Ante', payout: 2 }],
    tieRule: 'split',
  },
  'dragon-tiger': {
    key: 'dragon-tiger',
    name: 'Dragon Tiger',
    evaluationMode: 'high-card',
    handSize: 1,
    playerCount: 2,
    sides: ['dragon', 'tiger'],
    bets: [
      { key: 'dragon', label: 'Dragon', payout: 2 },
      { key: 'tiger', label: 'Tiger', payout: 2 },
      { key: 'tie', label: 'Tie', payout: 9 },
    ],
    tieRule: 'tie-bet',
  },
  baccarat: {
    key: 'baccarat',
    name: 'Baccarat',
    evaluationMode: 'point-total',
    target: 9,
    handSize: 2,
    playerCount: 2,
    sides: ['player', 'banker'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'banker', label: 'Banker', payout: 1.95 },
      { key: 'tie', label: 'Tie', payout: 9 },
    ],
    tieRule: 'tie-bet',
  },
  blackjack: {
    key: 'blackjack',
    name: 'Blackjack',
    evaluationMode: 'blackjack',
    target: 21,
    handSize: 2,
    playerCount: 1,
    interactive: true,
    dealerBehavior: 'stand-on',
    dealerStandValue: 17,
    drawRules: { allowDraw: true, maxDraws: 9 },
    sides: ['player', 'dealer'],
    bets: [{ key: 'main', label: 'Main', payout: 2 }],
    tieRule: 'push',
  },
  'casino-war': {
    key: 'casino-war',
    name: 'Casino War',
    evaluationMode: 'high-card',
    handSize: 1,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'tie', label: 'Tie', payout: 11 },
    ],
    tieRule: 'tie-bet',
  },
  'andar-bahar': {
    key: 'andar-bahar',
    name: 'Andar Bahar',
    evaluationMode: 'side-match',
    handSize: 0,
    playerCount: 2,
    sides: ['andar', 'bahar'],
    bets: [
      { key: 'andar', label: 'Andar', payout: 1.97 },
      { key: 'bahar', label: 'Bahar', payout: 2.0 },
    ],
    tieRule: 'push',
  },
  'lucky-7': {
    key: 'lucky-7',
    name: 'Lucky 7',
    evaluationMode: 'over-under',
    target: 7,
    handSize: 1,
    playerCount: 1,
    sides: ['over', 'under', 'equal'],
    bets: [
      { key: 'over', label: 'Above 7', payout: 2 },
      { key: 'under', label: 'Below 7', payout: 2 },
      { key: 'equal', label: 'Lucky 7', payout: 12 },
    ],
    tieRule: 'push',
  },
  '32-cards': {
    key: '32-cards',
    name: '32 Cards',
    evaluationMode: 'sum-points',
    handSize: 1,
    playerCount: 4,
    sides: ['8', '9', '10', '11'],
    bets: [
      { key: '8', label: 'Player 8', payout: 4 },
      { key: '9', label: 'Player 9', payout: 4 },
      { key: '10', label: 'Player 10', payout: 4 },
      { key: '11', label: 'Player 11', payout: 4 },
    ],
    tieRule: 'split',
  },
  'three-card-judgement': {
    key: 'three-card-judgement',
    name: 'Three Card Judgement',
    evaluationMode: 'poker-rank',
    handSize: 3,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    sideBets: [{ key: 'flush', label: 'Flush+', payout: 4 }],
    tieRule: 'push',
  },
  'one-card': {
    key: 'one-card',
    name: 'One Card',
    evaluationMode: 'high-card',
    handSize: 1,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    tieRule: 'push',
  },
  queen: {
    key: 'queen',
    name: 'Queen',
    evaluationMode: 'high-card',
    handSize: 1,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    tieRule: 'push',
  },
  'dus-ka-dum': {
    key: 'dus-ka-dum',
    name: 'Dus Ka Dum',
    evaluationMode: 'high-card',
    handSize: 1,
    playerCount: 2,
    sides: ['player', 'dealer'],
    bets: [
      { key: 'player', label: 'Player', payout: 2 },
      { key: 'dealer', label: 'Dealer', payout: 2 },
    ],
    tieRule: 'push',
  },
};

export const CARD_VARIANT_KEYS = Object.keys(CARD_VARIANT_PRESETS);
export const DEFAULT_CARD_VARIANT = 'dragon-tiger';

/**
 * Resolves a variant key into a complete, validated ruleset. Custom variants
 * (e.g. admin-defined) can be supplied via the `custom` map and take priority.
 */
export class VariantResolver {
  constructor(private readonly custom: Record<string, Partial<CardGameRuleSet>> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in CARD_VARIANT_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...CARD_VARIANT_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string, overrides?: Partial<CardGameRuleSet>): CardGameRuleSet {
    const preset = this.custom[key] ?? CARD_VARIANT_PRESETS[key];
    if (!preset) {
      throw new Error(`Unknown card variant "${key}"`);
    }
    return RuleResolver.resolve(preset, overrides);
  }
}
