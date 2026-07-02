import { Injectable } from '@nestjs/common';
import {
  ProvablyFairWheel,
  RouletteEngine,
  type RouletteBet,
  type RouletteRoundResult,
} from '@gaming-platform/roulette-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { RouletteVariantService } from './roulette-variant.service';

export interface StatelessSpinResult {
  result: RouletteRoundResult;
  fairness: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    seed: string;
  };
}

/**
 * Stateless, deterministic roulette computation — one self-contained, fully
 * verifiable spin. Ideal for demos, integration tests and provably-fair
 * verification. Multi-round play with persistence lives in
 * {@link RouletteSessionService}.
 */
@Injectable()
export class RouletteEngineService {
  constructor(
    private readonly variants: RouletteVariantService,
    private readonly fair: ProvablyFairService,
  ) {}

  async play(
    variantKey: string,
    bets: RouletteBet[],
    clientSeed?: string,
  ): Promise<StatelessSpinResult> {
    const ruleset = await this.variants.resolve(variantKey);
    const commit = this.fair.createCommit();
    const seed = this.fair.deriveSeed(commit.serverSeed, clientSeed ?? commit.serverSeedHash, commit.nonce);
    const engine = new RouletteEngine(ruleset, seed);
    const result = engine.spin(`stateless:${commit.nonce}`, bets);
    return {
      result,
      fairness: {
        // One-shot spin — the server seed is revealed immediately for verification.
        serverSeed: commit.serverSeed,
        serverSeedHash: commit.serverSeedHash,
        clientSeed: clientSeed ?? commit.serverSeedHash,
        nonce: commit.nonce,
        seed,
      },
    };
  }

  /** Reproduce the deterministic spin outcome for a seed + variant. */
  async verifySpin(variantKey: string, seed: string) {
    const ruleset = await this.variants.resolve(variantKey);
    return ProvablyFairWheel.verification(seed, ruleset.layout);
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
