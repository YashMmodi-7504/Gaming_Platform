import type { Participant } from './types';

/** Smallest power of two ≥ n. */
export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}

/** Deterministic LCG shuffle (no Math.random — reproducible from a numeric seed). */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let s = (seed || 1) >>> 0;
  for (let i = result.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Standard single-elimination seeding order for a bracket of `size` (a power of
 * two): returns the seed numbers (1-based) in bracket-slot order so the top seed
 * meets the bottom seed, and strong seeds only meet late.
 */
export function standardSeedOrder(size: number): number[] {
  let rounds: number[] = [1, 2];
  while (rounds.length < size) {
    const next: number[] = [];
    const sum = rounds.length * 2 + 1;
    for (const seed of rounds) {
      next.push(seed);
      next.push(sum - seed);
    }
    rounds = next;
  }
  return rounds;
}

/**
 * Assign seeds to participants. With `byRating` the strongest (highest rating)
 * gets seed 1; otherwise the order is shuffled deterministically by `seed`.
 */
export function assignSeeds(
  participants: Participant[],
  options: { byRating?: boolean; seed?: number } = {},
): Participant[] {
  const ordered = options.byRating
    ? [...participants].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    : seededShuffle(participants, options.seed ?? 1);
  return ordered.map((p, i) => ({ ...p, seed: i + 1 }));
}
