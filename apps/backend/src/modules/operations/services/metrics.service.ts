import { Injectable } from '@nestjs/common';
import { MetricRegistry, type Labels, type MetricsSnapshot } from '@gaming-platform/ops-core';

/**
 * Central metrics collection. A single in-process {@link MetricRegistry} records
 * HTTP, domain (wallet/game/tournament) and system metrics; the operations
 * dashboard and Prometheus scrape both read from here.
 */
@Injectable()
export class MetricsService {
  private readonly registry = new MetricRegistry();

  /** Record a completed HTTP request. */
  recordHttp(method: string, route: string, status: number, durationMs: number): void {
    const labels: Labels = { method, route, status: String(status) };
    this.registry.inc('http_requests_total', labels);
    this.registry.observe('http_request_duration_ms', durationMs, { method, route });
    if (status >= 500) this.registry.inc('http_errors_total', { route });
  }

  /** Increment a domain counter (e.g. wallet_settlements, game_rounds). */
  count(name: string, labels?: Labels, by = 1): void {
    this.registry.inc(name, labels, by);
  }

  /** Observe a domain latency/size sample. */
  observe(name: string, value: number, labels?: Labels): void {
    this.registry.observe(name, value, labels);
  }

  /** Set a gauge (e.g. memory_bytes, ws_connections). */
  gauge(name: string, value: number, labels?: Labels): void {
    this.registry.setGauge(name, value, labels);
  }

  snapshot(): MetricsSnapshot {
    return this.registry.snapshot();
  }

  prometheus(): string {
    return this.registry.prometheus();
  }

  /** Derived error rate over all HTTP requests (0..1). */
  errorRate(): number {
    const snap = this.registry.snapshot();
    let requests = 0;
    let errors = 0;
    for (const [key, value] of Object.entries(snap.counters)) {
      if (key.startsWith('http_requests_total')) requests += value;
      if (key.startsWith('http_errors_total')) errors += value;
    }
    return requests > 0 ? errors / requests : 0;
  }

  /** Aggregate p95 request latency across all routes. */
  latencyP95(): number {
    const snap = this.registry.snapshot();
    const values = Object.entries(snap.histograms)
      .filter(([k]) => k.startsWith('http_request_duration_ms'))
      .map(([, h]) => h.p95);
    return values.length ? Math.max(...values) : 0;
  }

  throughput(): number {
    const snap = this.registry.snapshot();
    return Object.entries(snap.counters)
      .filter(([k]) => k.startsWith('http_requests_total'))
      .reduce((sum, [, v]) => sum + v, 0);
  }
}
