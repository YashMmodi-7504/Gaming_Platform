/**
 * Card primitives. Cards are immutable value objects; jokers are represented by
 * the dedicated `joker` suit and `JOKER` rank so a single `Card` type covers
 * every deck configuration.
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';

export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | 'JOKER';

export interface Card {
  rank: Rank;
  suit: Suit;
  /** Blackjack-style face value (Ace = 11, face cards = 10, joker = 0). */
  value: number;
}

export const SUITS: ReadonlyArray<Exclude<Suit, 'joker'>> = [
  'hearts',
  'diamonds',
  'clubs',
  'spades',
];

export const RANKS: ReadonlyArray<Exclude<Rank, 'JOKER'>> = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

const SUIT_CODE: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
  joker: 'X',
};

const RANK_CODE: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': 'T',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
  JOKER: 'J',
};

const CODE_TO_SUIT: Record<string, Suit> = { H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades', X: 'joker' };
const CODE_TO_RANK: Record<string, Rank> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
};

/** Blackjack-style face value for a rank. */
export function rankFaceValue(rank: Rank): number {
  if (rank === 'JOKER') return 0;
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
  return Number(rank);
}

/** Ordinal of a rank (2 = 2 … A = 14, ace-high by default; joker = 0). */
export function rankOrder(rank: Rank, aceHigh = true): number {
  if (rank === 'JOKER') return 0;
  if (rank === 'A') return aceHigh ? 14 : 1;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return Number(rank);
}

/** Baccarat-style point value (10/face = 0, ace = 1). */
export function rankBaccaratValue(rank: Rank): number {
  if (rank === 'JOKER') return 0;
  if (rank === 'A') return 1;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 0;
  return Number(rank);
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { rank, suit, value: rankFaceValue(rank) };
}

export const JOKER: Card = { rank: 'JOKER', suit: 'joker', value: 0 };

/**
 * Serializes a card to a compact 2-char code, e.g. `AS`, `TH`, `XX` (joker).
 * The {@link CardSerializer} is used for replay frames and the fair-play feed.
 */
export const CardSerializer = {
  encode(card: Card): string {
    return `${RANK_CODE[card.rank]}${SUIT_CODE[card.suit]}`;
  },
  encodeMany(cards: readonly Card[]): string[] {
    return cards.map((c) => CardSerializer.encode(c));
  },
};

export const CardDeserializer = {
  decode(code: string): Card {
    const rankCode = code.slice(0, code.length - 1);
    const suitCode = code.slice(-1);
    if (suitCode === 'X') return JOKER;
    const rank = CODE_TO_RANK[rankCode];
    const suit = CODE_TO_SUIT[suitCode];
    if (!rank || !suit) throw new Error(`Invalid card code "${code}"`);
    return makeCard(rank, suit);
  },
  decodeMany(codes: readonly string[]): Card[] {
    return codes.map((c) => CardDeserializer.decode(c));
  },
};

export interface DeckBuildOptions {
  decks?: number;
  jokersPerDeck?: number;
}

/** Build an ordered deck (52 × decks, plus optional jokers). */
export function buildDeck(options: DeckBuildOptions = {}): Card[] {
  const decks = Math.max(1, options.decks ?? 1);
  const jokers = Math.max(0, options.jokersPerDeck ?? 0);
  const cards: Card[] = [];
  for (let d = 0; d < decks; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push(makeCard(rank, suit));
      }
    }
    for (let j = 0; j < jokers; j += 1) {
      cards.push({ ...JOKER });
    }
  }
  return cards;
}

/** Back-compat: a single ordered standard 52-card deck. */
export function createStandardDeck(decks = 1): Card[] {
  return buildDeck({ decks });
}
