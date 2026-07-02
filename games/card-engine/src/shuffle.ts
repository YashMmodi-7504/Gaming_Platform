import { SeededRng, type Rng } from '@gaming-platform/game-sdk';

import { buildDeck, CardSerializer, type Card, type DeckBuildOptions } from './card';

/** Abstracts the source of randomness used to shuffle. */
export interface RandomizationProvider {
  shuffle<T>(items: readonly T[]): T[];
  int(min: number, max: number): number;
}

/** Default provider backed by an injected RNG (seeded for determinism). */
export class RngRandomizationProvider implements RandomizationProvider {
  constructor(private readonly rng: Rng) {}
  shuffle<T>(items: readonly T[]): T[] {
    return this.rng.shuffle(items);
  }
  int(min: number, max: number): number {
    return this.rng.int(min, max);
  }
}

/** Shuffles decks using a randomization provider. */
export class ShuffleManager {
  constructor(private readonly provider: RandomizationProvider) {}

  shuffle(cards: readonly Card[]): Card[] {
    return this.provider.shuffle(cards);
  }
}

export interface ShuffleVerification {
  seed: string;
  deckOptions: DeckBuildOptions;
  shuffledDeck: string[];
}

/**
 * Deterministic, reproducible card shuffler. Given the same seed (derived by the
 * platform's `ProvablyFairService` from server seed + client seed + nonce) it
 * always produces the identical deck order, enabling full shuffle verification.
 */
export const ProvablyFairCardShuffler = {
  shuffle(seed: string, options: DeckBuildOptions = {}): Card[] {
    return new SeededRng(seed).shuffle(buildDeck(options));
  },

  /** Reproduce the shuffle and return verification data (encoded deck order). */
  verification(seed: string, options: DeckBuildOptions = {}): ShuffleVerification {
    return {
      seed,
      deckOptions: options,
      shuffledDeck: CardSerializer.encodeMany(ProvablyFairCardShuffler.shuffle(seed, options)),
    };
  },

  /** Verify that a published deck order matches the seed. */
  verify(seed: string, options: DeckBuildOptions, expectedDeck: readonly string[]): boolean {
    const actual = CardSerializer.encodeMany(ProvablyFairCardShuffler.shuffle(seed, options));
    return (
      actual.length === expectedDeck.length && actual.every((code, i) => code === expectedDeck[i])
    );
  },
};
