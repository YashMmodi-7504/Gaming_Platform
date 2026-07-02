/**
 * In-process metrics primitives: counters, gauges and histograms with exact
 * percentiles, plus a registry that snapshots and exports Prometheus text. Pure
 * and dependency-free — the backend wires it to HTTP, the wallet, games, etc.
 */

export type MetricType = 'counter' | 'gauge' | 'histogram';

export type Labels = Record<string, string>;

function labelKey(name: string, labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const parts = Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`);
  return `${name}{${parts.join(',')}}`;
}

export class Counter {
  private value = 0;
  inc(by = 1): void {
    if (by < 0) throw new Error('Counter increment must be non-negative');
    this.value += by;
  }
  get(): number {
    return this.value;
  }
}

export class Gauge {
  private value = 0;
  set(v: number): void {
    this.value = v;
  }
  inc(by = 1): void {
    this.value += by;
  }
  dec(by = 1): void {
    this.value -= by;
  }
  get(): number {
    return this.value;
  }
}

export interface HistogramSnapshot {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * A histogram that keeps a bounded sample reservoir for exact percentiles. When
 * full it overwrites oldest samples (ring), so memory is bounded while recent
 * percentiles stay accurate.
 */
export class Histogram {
  private samples: number[] = [];
  private cursor = 0;
  private _count = 0;
  private _sum = 0;
  private _min = Number.POSITIVE_INFINITY;
  private _max = Number.NEGATIVE_INFINITY;

  constructor(private readonly maxSamples = 4096) {}

  observe(value: number): void {
    this._count += 1;
    this._sum += value;
    if (value < this._min) this._min = value;
    if (value > this._max) this._max = value;
    if (this.samples.length < this.maxSamples) {
      this.samples.push(value);
    } else {
      this.samples[this.cursor] = value;
      this.cursor = (this.cursor + 1) % this.maxSamples;
    }
  }

  percentile(p: number): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx]!;
  }

  snapshot(): HistogramSnapshot {
    // Sort once and read all percentiles from it (was 4 sorts per snapshot).
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (p: number): number => {
      if (sorted.length === 0) return 0;
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
      return sorted[idx]!;
    };
    return {
      count: this._count,
      sum: Number(this._sum.toFixed(6)),
      min: this._count ? this._min : 0,
      max: this._count ? this._max : 0,
      mean: this._count ? Number((this._sum / this._count).toFixed(6)) : 0,
      p50: at(50),
      p90: at(90),
      p95: at(95),
      p99: at(99),
    };
  }
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramSnapshot>;
}

/** A registry of named, optionally-labelled metrics. */
export class MetricRegistry {
  private readonly counters = new Map<string, Counter>();
  private readonly gauges = new Map<string, Gauge>();
  private readonly histograms = new Map<string, Histogram>();

  counter(name: string, labels?: Labels): Counter {
    return this.getOrCreate(this.counters, labelKey(name, labels), () => new Counter());
  }

  gauge(name: string, labels?: Labels): Gauge {
    return this.getOrCreate(this.gauges, labelKey(name, labels), () => new Gauge());
  }

  histogram(name: string, labels?: Labels): Histogram {
    return this.getOrCreate(this.histograms, labelKey(name, labels), () => new Histogram());
  }

  inc(name: string, labels?: Labels, by = 1): void {
    this.counter(name, labels).inc(by);
  }

  setGauge(name: string, value: number, labels?: Labels): void {
    this.gauge(name, labels).set(value);
  }

  observe(name: string, value: number, labels?: Labels): void {
    this.histogram(name, labels).observe(value);
  }

  snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries([...this.counters].map(([k, v]) => [k, v.get()])),
      gauges: Object.fromEntries([...this.gauges].map(([k, v]) => [k, v.get()])),
      histograms: Object.fromEntries([...this.histograms].map(([k, v]) => [k, v.snapshot()])),
    };
  }

  /** Prometheus text exposition format. */
  prometheus(): string {
    const lines: string[] = [];
    for (const [key, counter] of this.counters) lines.push(`${key} ${counter.get()}`);
    for (const [key, gauge] of this.gauges) lines.push(`${key} ${gauge.get()}`);
    for (const [key, histo] of this.histograms) {
      const s = histo.snapshot();
      const base = key.includes('{') ? key.slice(0, -1) + ',' : `${key}{`;
      lines.push(`${base}quantile="0.5"} ${s.p50}`);
      lines.push(`${base}quantile="0.9"} ${s.p90}`);
      lines.push(`${base}quantile="0.95"} ${s.p95}`);
      lines.push(`${base}quantile="0.99"} ${s.p99}`);
      lines.push(`${histogramName(key)}_count ${s.count}`);
      lines.push(`${histogramName(key)}_sum ${s.sum}`);
    }
    return lines.join('\n') + '\n';
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private getOrCreate<T>(map: Map<string, T>, key: string, make: () => T): T {
    let value = map.get(key);
    if (!value) {
      value = make();
      map.set(key, value);
    }
    return value;
  }
}

function histogramName(key: string): string {
  return key.includes('{') ? key.slice(0, key.indexOf('{')) : key;
}
