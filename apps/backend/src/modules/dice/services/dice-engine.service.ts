import { Injectable } from '@nestjs/common';
import {
  DiceEngine,
  ProvablyFairDiceRoller,
  type DiceBet,
  type DiceRoundResult,
} from '@gaming-platform/dice-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { DiceVariantService } from './dice-variant.service';

export interface StatelessRollResult {
  result: DiceRoundResult;
  fairness: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    seed: string;
  };
}

/**
 * Stateless, deterministic dice computation — one self-contained, fully
 * verifiable roll. Ideal for demos, integration tests and provably-fair
 * verification. Multi-round play with persistence lives in
 * {@link DiceSessionService}.
 */
@Injectable()
export class DiceEngineService {
  constructor(
    private readonly variants: DiceVariantService,
    private readonly fair: ProvablyFairService,
  ) {}

  async play(variantKey: string, bets: DiceBet[], clientSeed?: string): Promise<StatelessRollResult> {
    const ruleset = await this.variants.resolve(variantKey);
    const commit = this.fair.createCommit();
    const seed = this.fair.deriveSeed(commit.serverSeed, clientSeed ?? commit.serverSeedHash, commit.nonce);
    const engine = new DiceEngine(ruleset, seed);
    const result = engine.roll(`stateless:${commit.nonce}`, bets);
    return {
      result,
      fairness: {
        // One-shot roll — the server seed is revealed immediately for verification.
        serverSeed: commit.serverSeed,
        serverSeedHash: commit.serverSeedHash,
        clientSeed: clientSeed ?? commit.serverSeedHash,
        nonce: commit.nonce,
        seed,
      },
    };
  }

  /** Reproduce the deterministic dice outcome for a seed + variant. */
  async verifyRoll(variantKey: string, seed: string) {
    const ruleset = await this.variants.resolve(variantKey);
    return ProvablyFairDiceRoller.verification(seed, ruleset.diceCount, ruleset.faces);
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
