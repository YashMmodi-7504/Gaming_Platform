import { describe, expect, it } from 'vitest';

import { Alerts, emptyAlertState, type AlertRule } from './alerts';
import { dependencyGraph, rollup, TraceIdFactory } from './health';
import { Histogram, MetricRegistry } from './metrics';
import { CircuitBreaker, RetryPolicy, TokenBucket } from './resilience';

describe('metrics', () => {
  it('counts, gauges and observes', () => {
    const reg = new MetricRegistry();
    reg.inc('http_requests', { route: '/a' }, 3);
    reg.inc('http_requests', { route: '/a' });
    reg.setGauge('mem_bytes', 1024);
    reg.observe('latency_ms', 10);
    const snap = reg.snapshot();
    expect(snap.counters['http_requests{route="/a"}']).toBe(4);
    expect(snap.gauges['mem_bytes']).toBe(1024);
    expect(snap.histograms['latency_ms']!.count).toBe(1);
  });

  it('computes exact percentiles over a large sample (load)', () => {
    const h = new Histogram(200000);
    for (let i = 1; i <= 100000; i += 1) h.observe(i);
    const s = h.snapshot();
    expect(s.count).toBe(100000);
    expect(s.min).toBe(1);
    expect(s.max).toBe(100000);
    expect(s.p50).toBeGreaterThanOrEqual(49000);
    expect(s.p50).toBeLessThanOrEqual(51000);
    expect(s.p99).toBeGreaterThanOrEqual(98000);
  });

  it('exports Prometheus text', () => {
    const reg = new MetricRegistry();
    reg.inc('errors_total', undefined, 2);
    reg.observe('req_seconds', 0.2);
    const text = reg.prometheus();
    expect(text).toContain('errors_total 2');
    expect(text).toContain('req_seconds_count 1');
    expect(text).toContain('quantile="0.99"');
  });
});

describe('alert evaluation', () => {
  const rule: AlertRule = {
    id: 'err',
    name: 'High error rate',
    metric: 'error_rate',
    comparator: '>',
    threshold: 0.05,
    forSeconds: 60,
    severity: 'critical',
    enabled: true,
  };

  it('fires only after the sustain window, then resolves', () => {
    let state = emptyAlertState(0);
    state = Alerts.evaluate(rule, state, 0.1, 0); // breach starts
    expect(state.status).toBe('pending');
    state = Alerts.evaluate(rule, state, 0.1, 30_000); // still pending (<60s)
    expect(state.status).toBe('pending');
    state = Alerts.evaluate(rule, state, 0.1, 61_000); // sustained → firing
    expect(state.status).toBe('firing');
    state = Alerts.evaluate(rule, state, 0.01, 70_000); // recovered
    expect(state.status).toBe('resolved');
  });

  it('respects the enabled flag', () => {
    const disabled = { ...rule, enabled: false };
    const state = Alerts.evaluate(disabled, emptyAlertState(), 1, 0);
    expect(state.status).toBe('ok');
  });
});

describe('resilience — circuit breaker (chaos / recovery)', () => {
  it('trips open, cools down to half-open, then recovers', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, openMs: 1000 });
    cb.recordFailure(0);
    cb.recordFailure(10);
    cb.recordFailure(20);
    expect(cb.current).toBe('open');
    expect(cb.canRequest(100)).toBe(false); // within cooldown
    expect(cb.canRequest(1100)).toBe(true); // cooldown elapsed → half-open
    expect(cb.current).toBe('half-open');
    cb.recordSuccess();
    cb.recordSuccess();
    expect(cb.current).toBe('closed');
  });

  it('a failure in half-open re-trips the breaker', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, successThreshold: 1, openMs: 500 });
    cb.recordFailure(0);
    expect(cb.current).toBe('open');
    cb.canRequest(600); // → half-open
    cb.recordFailure(600);
    expect(cb.current).toBe('open');
  });
});

describe('resilience — retry & rate limiting', () => {
  it('computes capped exponential backoff', () => {
    const cfg = { maxAttempts: 5, baseDelayMs: 100, factor: 2, maxDelayMs: 1000 };
    expect(RetryPolicy.schedule(cfg)).toEqual([100, 200, 400, 800]);
    expect(RetryPolicy.delay(10, cfg)).toBe(1000); // capped
    expect(RetryPolicy.shouldRetry(5, cfg)).toBe(false);
  });

  it('limits with a refilling token bucket', () => {
    const bucket = new TokenBucket(2, 1, 0); // cap 2, 1/sec
    expect(bucket.tryRemove(0)).toBe(true);
    expect(bucket.tryRemove(0)).toBe(true);
    expect(bucket.tryRemove(0)).toBe(false); // empty
    expect(bucket.tryRemove(1000)).toBe(true); // +1 token after 1s
  });
});

describe('health & tracing', () => {
  it('rolls up dependency health', () => {
    expect(rollup([{ name: 'db', status: 'up', critical: true }])).toBe('up');
    expect(rollup([{ name: 'db', status: 'down', critical: true }])).toBe('down');
    expect(rollup([{ name: 'cache', status: 'degraded', critical: false }])).toBe('degraded');
    expect(dependencyGraph().length).toBeGreaterThan(0);
  });

  it('generates trace ids with propagated trace id', () => {
    const factory = new TraceIdFactory();
    const root = factory.next();
    const child = factory.next(root);
    expect(child.traceId).toBe(root.traceId);
    expect(child.parentSpanId).toBe(root.spanId);
    expect(root.spanId).toHaveLength(16);
  });
});
