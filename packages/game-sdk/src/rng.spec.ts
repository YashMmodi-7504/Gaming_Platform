import { describe, expect, it } from 'vitest';

import { SeededRng, createRng } from './rng';

describe('SeededRng', () => {
  it('is deterministic for identical seeds', () => {
    const a = new SeededRng('seed-123');
    const b = new SeededRng('seed-123');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = Array.from({ length: 5 }, () => new SeededRng('a').next());
    const b = Array.from({ length: 5 }, () => new SeededRng('b').next());
    expect(a).not.toEqual(b);
  });

  it('produces floats in [0, 1)', () => {
    const rng = createRng('floats');
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int respects the inclusive range', () => {
    const rng = createRng('ints');
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('shuffle is a permutation', () => {
    const rng = createRng('shuffle');
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = rng.shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });

  it('weighted honors weights deterministically', () => {
    const rng = createRng('weighted');
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.weighted([
        { value: 'a' as const, weight: 9 },
        { value: 'b' as const, weight: 1 },
      ]);
      counts[v] += 1;
    }
    expect(counts.a).toBeGreaterThan(counts.b);
  });
});
