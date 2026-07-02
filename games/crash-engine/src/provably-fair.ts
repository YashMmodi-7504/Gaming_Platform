import { SeededRng, type Rng } from '@gaming-platform/game-sdk';

import type { CrashGameRuleSet } from './rules';

/** Abstracts the source of randomness used to generate a crash point. */
export interface RandomizationProvider {
  next(): number;
}

/** Default provider backed by an injected (seeded) RNG. */
export class RngRandomizationProvider implements RandomizationProvider {
  constructor(private readonly rng: Rng) {}
  next(): number {
    return this.rng.next();
  }
}

/** The distribution parameters that shape a crash point. */
export interface CrashDistribution {
  minMultiplier: number;
  maxMultiplier: number;
  houseEdge: number;
  volatility: number;
}

export interface CrashVerification {
  seed: string;
  uniform: number;
  crashPoint: number;
  distribution: CrashDistribution;
}

function distributionOf(ruleset: CrashGameRuleSet): CrashDistribution {
  return {
    minMultiplier: ruleset.minMultiplier,
    maxMultiplier: ruleset.maxMultiplier,
    houseEdge: ruleset.houseEdge,
    volatility: ruleset.volatility,
  };
}

/** Round a multiplier down to 2 decimals (never inflate the player's edge). */
function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Deterministic, reproducible crash-point generator. Given the same seed
 * (derived by the platform's `ProvablyFairService` from server seed + client
 * seed + nonce) it always yields the identical crash point, enabling full crash
 * verification and replay.
 *
 * The crash point is a single uniform draw mapped through a heavy-tailed
 * distribution: an instant bust with probability `houseEdge`, otherwise
 * `((1 - houseEdge) / (1 - u)) ^ volatility`, clamped to the configured range.
 */
export const ProvablyFairCrashGenerator = {
  /** The raw uniform draw for a seed (exposed for verification). */
  uniform(seed: string): number {
    return new SeededRng(seed).next();
  },

  /** Compute the crash point for a seed and distribution. */
  crashPoint(seed: string, dist: CrashDistribution): number {
    const u = ProvablyFairCrashGenerator.uniform(seed);
    if (u < dist.houseEdge) return dist.minMultiplier;
    const base = (1 - dist.houseEdge) / (1 - u);
    const raw = Math.pow(base, dist.volatility);
    return Math.min(dist.maxMultiplier, Math.max(dist.minMultiplier, floor2(raw)));
  },

  /** Crash point directly from a ruleset. */
  fromRuleset(seed: string, ruleset: CrashGameRuleSet): number {
    return ProvablyFairCrashGenerator.crashPoint(seed, distributionOf(ruleset));
  },

  /** Reproduce the crash point and return full verification data. */
  verification(seed: string, ruleset: CrashGameRuleSet): CrashVerification {
    const distribution = distributionOf(ruleset);
    return {
      seed,
      uniform: ProvablyFairCrashGenerator.uniform(seed),
      crashPoint: ProvablyFairCrashGenerator.crashPoint(seed, distribution),
      distribution,
    };
  },

  /** Verify that a published crash point matches the seed. */
  verify(seed: string, ruleset: CrashGameRuleSet, expected: number): boolean {
    return ProvablyFairCrashGenerator.fromRuleset(seed, ruleset) === expected;
  },
};
