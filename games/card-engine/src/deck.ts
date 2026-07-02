import {
  buildDeck,
  makeCard,
  rankBaccaratValue,
  rankFaceValue,
  rankOrder,
  type Card,
  type DeckBuildOptions,
} from './card';
import { ProvablyFairCardShuffler, type ShuffleManager, type RandomizationProvider } from './shuffle';

/** Card factory + value queries — a single place for per-card semantics. */
export const CardManager = {
  create: makeCard,
  faceValue: rankFaceValue,
  order: rankOrder,
  baccaratValue: rankBaccaratValue,
  isRed: (card: Card): boolean => card.suit === 'hearts' || card.suit === 'diamonds',
  isJoker: (card: Card): boolean => card.suit === 'joker',
  equals: (a: Card, b: Card): boolean => a.rank === b.rank && a.suit === b.suit,
  sameRank: (a: Card, b: Card): boolean => a.rank === b.rank,
};

/**
 * A live deck (shoe) with a draw pointer. Cards are dealt from the top; burned
 * cards are tracked for fair-play auditing.
 */
export class Deck {
  private cards: Card[];
  private burned: Card[] = [];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  get remaining(): number {
    return this.cards.length;
  }

  peek(): Card | undefined {
    return this.cards[0];
  }

  draw(count = 1): Card[] {
    return this.cards.splice(0, Math.max(0, count));
  }

  drawOne(): Card {
    const card = this.cards.shift();
    if (!card) throw new Error('Deck is empty');
    return card;
  }

  burn(count = 1): Card[] {
    const burned = this.draw(count);
    this.burned.push(...burned);
    return burned;
  }

  toArray(): readonly Card[] {
    return this.cards;
  }

  burnedCards(): readonly Card[] {
    return this.burned;
  }
}

/**
 * Builds and shuffles decks. The provably-fair path produces a deterministic,
 * reproducible shoe from a seed; the generic path uses any randomization
 * provider.
 */
export class DeckManager {
  constructor(private readonly shuffleManager: ShuffleManager) {}

  build(options: DeckBuildOptions = {}): Card[] {
    return buildDeck(options);
  }

  shuffled(options: DeckBuildOptions = {}): Deck {
    return new Deck(this.shuffleManager.shuffle(buildDeck(options)));
  }

  /** Deterministic shoe from a provably-fair seed. */
  static fromSeed(seed: string, options: DeckBuildOptions = {}): Deck {
    return new Deck(ProvablyFairCardShuffler.shuffle(seed, options));
  }

  static fromProvider(provider: RandomizationProvider, options: DeckBuildOptions = {}): Deck {
    return new Deck(provider.shuffle(buildDeck(options)));
  }
}
