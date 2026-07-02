import type { StatisticsSnapshot } from '../types';

interface Observation {
  count: number;
  sum: number;
  min: number;
  max: number;
}

/**
 * Accumulates runtime statistics — discrete counters and continuous
 * observations (with min/max/avg) — for a single game session.
 */
export class GameStatisticsManager {
  private readonly counters = new Map<string, number>();
  private readonly observations = new Map<string, Observation>();

  increment(key: string, by = 1): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  observe(key: string, value: number): void {
    const existing = this.observations.get(key);
    if (!existing) {
      this.observations.set(key, { count: 1, sum: value, min: value, max: value });
      return;
    }
    existing.count += 1;
    existing.sum += value;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
  }

  getCounter(key: string): number {
    return this.counters.get(key) ?? 0;
  }

  snapshot(): StatisticsSnapshot {
    const observations: StatisticsSnapshot['observations'] = {};
    for (const [key, o] of this.observations) {
      observations[key] = {
        count: o.count,
        sum: o.sum,
        min: o.min,
        max: o.max,
        avg: o.count > 0 ? o.sum / o.count : 0,
      };
    }
    return { counters: Object.fromEntries(this.counters), observations };
  }

  reset(): void {
    this.counters.clear();
    this.observations.clear();
  }
}
