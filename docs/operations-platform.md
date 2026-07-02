# Enterprise Operations, Monitoring, Reliability & Production Platform

Observability, alerting, resilience and background processing for the whole
platform. Built on a pure, tested core (`@gaming-platform/ops-core`) wired into a
global NestJS `OperationsModule` and a realtime ops dashboard.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Admin Operations Dashboard (Overview · Metrics · Logs · Alerts ·    │
│  Queue) + live sparklines + Socket.IO                                │
├────────────────────────────────────────────────────────────────────┤
│  OperationsGateway (/operations)  overview + alert broadcasts        │
├────────────────────────────────────────────────────────────────────┤
│  MetricsInterceptor (APP_INTERCEPTOR, global)                        │
│    times every HTTP request → metrics + trace id + request log       │
├────────────────────────────────────────────────────────────────────┤
│  Services                                                            │
│   MetricsService · TracingService · LogBufferService ·               │
│   OperationsHealthService · MonitoringService (interval sampler) ·    │
│   AlertService · QueueService (retry + DLQ) · CircuitBreakerService   │
├────────────────────────────────────────────────────────────────────┤
│  @gaming-platform/ops-core (pure, deterministic, tested)             │
│   MetricRegistry (counter/gauge/histogram + percentiles + Prometheus)│
│   Alerts (rule evaluation + state machine) ·                         │
│   resilience (CircuitBreaker · RetryPolicy · TokenBucket) ·          │
│   health rollup · trace context                                      │
├────────────────────────────────────────────────────────────────────┤
│  Postgres (alert-rule config) · Redis (ping/health) · process stats  │
└────────────────────────────────────────────────────────────────────┘
```

`OperationsModule` is `@Global`, so the metrics interceptor and the metrics /
queue / circuit-breaker services are available to every module.

## Data flow

1. Every HTTP request passes through `MetricsInterceptor`: it starts a trace,
   times the request, and on completion records `http_requests_total`,
   `http_request_duration_ms` and (on 5xx) `http_errors_total`, and appends a
   structured entry to the log ring buffer.
2. `MonitoringService` samples the system every 5s (RSS, CPU%, event-loop lag),
   updates gauges, builds a metric-value snapshot, evaluates **all alert rules**,
   and pushes an overview to the dashboard over Socket.IO.
3. `AlertService` transitions each rule through `ok → pending → firing → resolved`
   and broadcasts incidents.
4. `QueueService` drains due background jobs, retrying with exponential backoff
   and dead-lettering exhausted jobs; `CircuitBreakerService` guards fragile
   downstream calls.

## Sequence: request → metrics → alert

```
Client → API → MetricsInterceptor.start(trace)
                     │ next.handle()
                     ▼
              controller/service
                     │
   MetricsInterceptor.finish(status, ms) → MetricsService.recordHttp
                                          → LogBufferService.push
   ... every 5s ...
   MonitoringService.sample → values{error_rate,latency_p95,...}
                            → AlertService.evaluate → (firing?) → Gateway.emitAlert
                            → Gateway.emitOverview → Dashboard
```

## Metrics catalog

| Metric | Type | Meaning |
| --- | --- | --- |
| `http_requests_total{method,route,status}` | counter | request throughput |
| `http_request_duration_ms{method,route}` | histogram | latency (p50/p90/p95/p99) |
| `http_errors_total{route}` | counter | 5xx errors |
| `memory_used_mb` | gauge | resident memory |
| `cpu_percent` | gauge | process CPU |
| `event_loop_lag_ms` | gauge | event-loop lag |
| `queue_backlog` | derived | pending background jobs |
| `ws_disconnects_total` | counter | socket disconnects (fed by gateways) |
| `failed_settlements_total` | counter | wallet settlement failures |
| `wallet_inconsistencies_total` | counter | ledger imbalance detections |

Domain modules add counters/observations via the exported `MetricsService`.
Everything is exportable in Prometheus text from `GET /admin/operations/metrics/prometheus`.

## Alert catalog (defaults — all configurable)

| Rule | Condition | Severity |
| --- | --- | --- |
| High error rate | `error_rate > 0.05` for 60s | critical |
| High latency | `latency_p95_ms > 1000` for 120s | warning |
| Database unavailable | `database_up < 1` | critical |
| Redis unavailable | `redis_up < 1` | critical |
| Queue backlog | `queue_backlog > 1000` for 120s | warning |
| High memory | `memory_used_mb > 1536` for 120s | warning |
| High CPU | `cpu_percent > 85` for 120s | warning |
| WS disconnect spike | `ws_disconnects > 100` for 60s | warning |
| Failed settlements | `failed_settlements > 5` for 60s | critical |
| Wallet inconsistency | `wallet_inconsistencies > 0` | critical |

Override or add rules via `POST /admin/operations/alerts` (stored in
`ApplicationSetting`, scope `alert-rule`).

## Resilience

- **Circuit breaker** — `closed → open → half-open → closed`; `execute()` 503s
  while open and records success/failure to drive recovery.
- **Retry policy** — capped exponential backoff (`base·factor^n`), used by the
  queue and available to services.
- **Rate limiting / backpressure** — token bucket (in addition to the global
  Throttler).
- **Dead-letter queue** — exhausted jobs are parked and re-queueable from the
  dashboard.
- **Graceful shutdown** — timers are cleared in `onModuleDestroy`.

## Recovery procedures (runbooks)

- **Database down** (`db-down` firing): check the `database` dependency latency in
  the overview; the circuit breaker for DB-backed calls will open automatically.
  Restore the DB; health flips to `up` within one sample (5s) and the alert
  auto-resolves.
- **Redis down**: realtime + cache degrade; sessions fall back to DB. Restore
  Redis; `redis_up` recovers and dependent circuits half-open then close.
- **Queue backlog**: inspect the Queue tab; scale workers or pause enqueues.
  Inspect the dead-letter queue and **Retry** fixable jobs.
- **Failed settlements / wallet inconsistency**: cross-check
  `GET /admin/wallet/reconcile` (trial balance). Use wallet rollback for any
  bad transaction; these alerts are critical and page on-call.
- **High latency / CPU / memory**: identify the hot route via
  `http_request_duration_ms` p95 per route; scale horizontally; the breaker and
  rate limiter shed load until recovery.

## API reference

**Admin** (`/admin/operations`, RBAC `analytics:read`; writes `settings:write`)
- `GET /overview` · `GET /health` · `GET /system`
- `GET /metrics` · `GET /metrics/prometheus`
- `GET /logs?level=&search=`
- `GET /queue` · `POST /queue/:jobId/retry`
- `GET /circuits`
- `GET /alerts` · `GET /alerts/active` · `POST /alerts`

**Public** (`/operations`)
- `GET /status` — service status (up / degraded / down)

**Realtime** (`/operations` Socket.IO): `operations:overview`, `operations:alert`.

All endpoints are Swagger-documented (`@ApiTags`/`@ApiOperation`/`@ApiBearerAuth`).

## Deployment notes

- Liveness/readiness probes: existing `/health/liveness` and `/health` (Terminus)
  plus `/operations/status` for a lightweight public status page.
- Scrape `/admin/operations/metrics/prometheus` for Prometheus/Grafana.
- The metrics interceptor is global and allocation-light (one histogram observe
  per request); the log buffer and histogram reservoirs are bounded, so memory
  stays flat under sustained load.

## Testing

`ops-core` (11 tests): counters/gauges, **exact percentiles over 100k samples**,
Prometheus export, alert sustain/resolve, circuit-breaker chaos/recovery, retry
backoff, token-bucket limiting, health rollup and trace propagation. Backend:
metrics aggregation and the queue's retry → dead-letter → requeue lifecycle.
