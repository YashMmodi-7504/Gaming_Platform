import { Injectable } from '@nestjs/common';
import {
  CrashEngine,
  ProvablyFairCrashGenerator,
  type CrashBet,
  type CrashRoundResult,
} from '@gaming-platform/crash-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { CrashVariantService } from './crash-variant.service';

export interface StatelessRoundResult {
  result: CrashRoundResult;
  fairness: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    seed: string;
  };
}

/**
 * Stateless, deterministic crash computation — one self-contained, fully
 * verifiable round. Ideal for demos, integration tests and provably-fair
 * verification. Multi-round play with persistence lives in
 * {@link CrashSessionService}.
 */
@Injectable()
export class CrashEngineService {
  constructor(
    private readonly variants: CrashVariantService,
    private readonly fair: ProvablyFairService,
  ) {}

  async play(
    variantKey: string,
    bets: CrashBet[],
    manualCashouts: Array<number | null> | undefined,
    clientSeed?: string,
  ): Promise<StatelessRoundResult> {
    const ruleset = await this.variants.resolve(variantKey);
    const commit = this.fair.createCommit();
    const seed = this.fair.deriveSeed(commit.serverSeed, clientSeed ?? commit.serverSeedHash, commit.nonce);
    const engine = new CrashEngine(ruleset, seed);
    const result = engine.playRound(`stateless:${commit.nonce}`, bets, manualCashouts ?? []);
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

  /** Reproduce the deterministic crash point for a seed + variant. */
  async verifyCrash(variantKey: string, seed: string) {
    const ruleset = await this.variants.resolve(variantKey);
    return ProvablyFairCrashGenerator.verification(seed, ruleset);
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
