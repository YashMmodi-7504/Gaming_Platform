import { SeededRng, type Rng } from '@gaming-platform/game-sdk';

import { Wheel } from './wheel';
import type { WheelLayout } from './rules';

/** Abstracts the source of randomness used to spin the wheel. */
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

export interface SpinOutcome {
  /** Landing slot on the physical ring. */
  index: number;
  /** Winning pocket number (`37` ⇒ `00`). */
  pocket: number;
}

export interface SpinVerification extends SpinOutcome {
  seed: string;
  label: string;
  color: string;
  sequence: number[];
}

/**
 * Deterministic, reproducible wheel spin. Given the same seed (derived by the
 * platform's `ProvablyFairService` from server seed + client seed + nonce) it
 * always lands on the identical pocket, enabling full spin verification and
 * replay. The seed → index mapping is a single uniform draw over the ring.
 */
export const ProvablyFairWheel = {
  /** The raw landing index for a seed over a ring of `size` pockets. */
  index(seed: string, size: number): number {
    return new SeededRng(seed).int(0, size - 1);
  },

  spin(seed: string, layout: WheelLayout): SpinOutcome {
    const index = ProvablyFairWheel.index(seed, layout.sequence.length);
    return { index, pocket: layout.sequence[index]! };
  },

  /** Reproduce the spin and return full verification data. */
  verification(seed: string, layout: WheelLayout): SpinVerification {
    const wheel = new Wheel(layout);
    const index = ProvablyFairWheel.index(seed, wheel.size);
    const pocket = wheel.at(index);
    return {
      seed,
      index,
      pocket: pocket.number,
      label: pocket.label,
      color: pocket.color,
      sequence: wheel.numbers(),
    };
  },

  /** Verify that a published pocket matches the seed. */
  verify(seed: string, layout: WheelLayout, expectedPocket: number): boolean {
    return ProvablyFairWheel.spin(seed, layout).pocket === expectedPocket;
  },
};

/**
 * Spins the wheel and produces the ball's deterministic landing plus rotation
 * metadata for animation. Provably fair when seeded; replayable for any seed.
 */
export class SpinManager {
  constructor(private readonly layout: WheelLayout) {}

  spin(seed: string): SpinOutcome {
    return ProvablyFairWheel.spin(seed, this.layout);
  }

  /** Spin with animation metadata (full turns + landing). */
  spinWithRotation(seed: string, turns = 5): SpinOutcome & { rotation: number } {
    const outcome = this.spin(seed);
    const wheel = new Wheel(this.layout);
    const rotation = turns * 360 + wheel.at(outcome.index).angle;
    return { ...outcome, rotation };
  }
}
