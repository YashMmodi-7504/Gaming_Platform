import type { Rng } from './types';

/** Hash an arbitrary string seed into a 32-bit unsigned integer (xmur3). */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * Deterministic, fast, isomorphic PRNG (mulberry32). Identical seeds produce
 * identical sequences on the server and the client — the basis for replay and
 * provably-fair verification. The seed source is a provably-fair HMAC computed
 * server-side; the engine only needs the resulting string.
 */
export class SeededRng implements Rng {
  private state: number;

  constructor(seed: string) {
    this.state = hashSeed(seed) || 1;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty array');
    return items[this.int(0, items.length - 1)]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }

  weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0) throw new Error('Total weight must be positive');
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, item.weight);
      if (roll < 0) return item.value;
    }
    return items[items.length - 1]!.value;
  }
}

/** Create a deterministic RNG from any string seed. */
export const createRng = (seed: string): Rng => new SeededRng(seed);
