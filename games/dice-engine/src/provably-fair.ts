import { SeededRng, type Rng } from '@gaming-platform/game-sdk';

import { DiceManager, type DiceSet } from './dice';

/** Abstracts the source of randomness used to roll dice. */
export interface RandomizationProvider {
  int(min: number, max: number): number;
}

/** Default provider backed by an injected (seeded) RNG. */
export class RngRandomizationProvider implements RandomizationProvider {
  constructor(private readonly rng: Rng) {}
  int(min: number, max: number): number {
    return this.rng.int(min, max);
  }
}

export interface RollVerification {
  seed: string;
  diceCount: number;
  faces: number;
  values: number[];
  total: number;
}

/**
 * Deterministic, reproducible dice roller. Given the same seed (derived by the
 * platform's `ProvablyFairService` from server seed + client seed + nonce) it
 * always produces the identical dice, enabling full roll verification and
 * replay. Each die is an independent uniform draw over its faces.
 */
export const ProvablyFairDiceRoller = {
  /** Roll raw face values for a seed. */
  values(seed: string, diceCount: number, faces: number): number[] {
    const rng = new SeededRng(seed);
    return Array.from({ length: Math.max(1, diceCount) }, () => rng.int(1, Math.max(2, faces)));
  },

  roll(seed: string, diceCount: number, faces: number): DiceSet {
    return DiceManager.fromValues(ProvablyFairDiceRoller.values(seed, diceCount, faces), faces);
  },

  /** Reproduce the roll and return full verification data. */
  verification(seed: string, diceCount: number, faces: number): RollVerification {
    const values = ProvablyFairDiceRoller.values(seed, diceCount, faces);
    return {
      seed,
      diceCount,
      faces,
      values,
      total: values.reduce((sum, v) => sum + v, 0),
    };
  },

  /** Verify that published dice values match the seed. */
  verify(seed: string, diceCount: number, faces: number, expected: readonly number[]): boolean {
    const actual = ProvablyFairDiceRoller.values(seed, diceCount, faces);
    return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  },
};

/**
 * Rolls dice and produces deterministic per-die animation metadata (a stable
 * tumble seed per die) so the UI animation is reproducible for any seed.
 */
export class RollManager {
  constructor(
    private readonly diceCount: number,
    private readonly faces: number,
  ) {}

  roll(seed: string): DiceSet {
    return ProvablyFairDiceRoller.roll(seed, this.diceCount, this.faces);
  }

  /** Roll with per-die spin metadata for animation. */
  rollWithSpins(seed: string): { set: DiceSet; spins: number[] } {
    const set = this.roll(seed);
    // Deterministic spin count per die derived from value + index — replayable.
    const spins = set.values().map((v, i) => 3 + ((v + i) % 4));
    return { set, spins };
  }
}
