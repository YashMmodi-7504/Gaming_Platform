/**
 * @gaming-platform/ops-core
 *
 * The pure, deterministic core of the Enterprise Operations platform: metrics
 * (counters / gauges / histograms with exact percentiles + Prometheus export),
 * configurable alert-rule evaluation, resilience primitives (circuit breaker,
 * retry policy, token-bucket rate limiter), dependency-health rollups and a
 * trace-context model.
 *
 * The backend `operations` module wires these to HTTP, the database, Redis, the
 * wallet, games and Socket.IO.
 */

export * from './metrics';
export * from './alerts';
export * from './resilience';
export * from './health';
