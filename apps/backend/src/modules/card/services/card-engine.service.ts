import { Injectable } from '@nestjs/common';
import {
  CardEngine,
  ProvablyFairCardShuffler,
  type CardRoundResult,
} from '@gaming-platform/card-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { CardVariantService } from './card-variant.service';

export interface PlacedBetInput {
  key: string;
  amount: string;
}

export interface StatelessRoundResult {
  result: CardRoundResult;
  fairness: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    seed: string;
  };
}

/**
 * Stateless, deterministic card computation — one self-contained, fully
 * verifiable round. Ideal for demos, integration tests, and provably-fair
 * verification. Multi-round play with persistence lives in
 * {@link CardSessionService}.
 */
@Injectable()
export class CardEngineService {
  constructor(
    private readonly variants: CardVariantService,
    private readonly fair: ProvablyFairService,
  ) {}

  async play(
    variantKey: string,
    bets: PlacedBetInput[],
    clientSeed?: string,
  ): Promise<StatelessRoundResult> {
    const ruleset = await this.variants.resolve(variantKey);
    const commit = this.fair.createCommit();
    const seed = this.fair.deriveSeed(commit.serverSeed, clientSeed ?? commit.serverSeedHash, commit.nonce);
    const engine = new CardEngine(ruleset, seed);
    const result = engine.playRound(`stateless:${commit.nonce}`, bets);
    return {
      result,
      fairness: {
        // One-shot round — the server seed is revealed immediately for verification.
        serverSeed: commit.serverSeed,
        serverSeedHash: commit.serverSeedHash,
        clientSeed: clientSeed ?? commit.serverSeedHash,
        nonce: commit.nonce,
        seed,
      },
    };
  }

  /** Reproduce the deterministic shoe for a seed (deck verification feed). */
  verifyShuffle(seed: string, decks = 1, jokersPerDeck = 0) {
    return ProvablyFairCardShuffler.verification(seed, { decks, jokersPerDeck });
  }

  verifyFairness(input: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    expectedSeed: string;
  }) {
    return this.fair.verify(input);
  }
}
