# Release Candidate 1 — Verification, Optimization & Production Hardening

Status: **PASS**. No architecture redesign, no breaking changes — verification,
profiling and safe optimization only. All five gates green; the integration suite,
the in-process load/perf harness and the runtime profiler all run and pass.

## Executive summary

The platform entered RC1 already production-hardened (helmet, gzip compression,
cookie parsing, strict CORS, global validation/whitelisting, graceful shutdown
hooks, a global metrics/tracing interceptor, optimistic locking + Redis locks +
idempotency in the wallet, bounded in-memory caches, and timers cleared on
shutdown). RC1 adds the missing **verification artifacts** (cross-module E2E
integration test, runnable load/perf harness, k6 HTTP load scripts, a runtime
profiler) and applies two **safe, measured optimizations**. Nothing changed
observable API behaviour.

**Production Readiness Score: 92 / 100.**

| Gate | Result |
| --- | --- |
| `pnpm prisma:generate` | ✓ |
| `pnpm typecheck` | ✓ 35 tasks |
| `pnpm lint` | ✓ 35 tasks, zero warnings |
| `pnpm test` | ✓ 29 tasks — incl. RC1 integration suite (18 backend suites / 75 tests) and all engine cores |
| `pnpm build` | ✓ 18 tasks |
| Integration (`rc1-e2e.spec.ts`) | ✓ full player journey conserves the ledger |
| Load harness (`tools/perf/bench.mjs`) | ✓ runs, see numbers below |
| Profiler (`tools/profiling/profile.mjs`) | ✓ runs, 0 leaks detected in the cores |

## Performance summary (in-process harness, `tools/perf/bench.mjs`)

Deterministic, no DB/Redis — measures the pure engine cores that back every hot
path. Representative run (dev laptop, Node 22):

| Scenario | Ops | Ops/sec | p50 | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| Wallet reserve+commit (settlement) | 10,000 | ~55,000 | 0.018ms | 0.024ms | 0.05ms |
| Tournament 1024-player bracket + exact payout | 200 | ~255 | 3.9ms | 4.5ms | 4.9ms |
| Ops metrics observe (100k samples + snapshot) | 200 | **2,870** | 0.34ms | 0.42ms | 0.63ms |
| Ops histogram.snapshot (4096 samples) | 20,000 | ~3,900 | 0.19ms | 0.50ms | 0.92ms |
| Ops registry recordHttp | 50,000 | ~1,100,000 | 0.001ms | 0.002ms | 0.003ms |
| AI recommend (500-game catalog) | 5,000 | ~6,600 | 0.14ms | 0.19ms | 0.32ms |
| AI fraud.assess | 50,000 | ~5,000,000 | <0.001ms | <0.001ms | 0.001ms |
| AI search.parseQuery | 50,000 | ~330,000 | 0.003ms | 0.006ms | 0.012ms |

Headline: a single Node process settles **>50k wallet rounds/sec** and scores
**>6k personalized recommendations/sec** over a 500-game catalog, entirely on CPU.

## Load test results

`tools/load/k6-load.js` models **1,000 → 5,000 → 10,000** concurrent virtual
users against a deployed instance, hitting catalog, search, AI, tournaments,
operations status and (authenticated) wallet/play endpoints. Thresholds gate the
run: `http_req_duration p95<400ms, p99<1000ms`, error rate `<1%`.

In-process the cores sustain the equivalent op rates with sub-millisecond p99
(table above), so the binding constraint at 10k VUs is I/O (DB/Redis/socket fan-out)
not CPU — addressed by the deployment recommendations below. The 10k-concurrent
wallet-operation invariant test (`wallet-core`) and the 100-concurrent settlement
test (`tournament-core`) both prove **zero balance/ledger corruption** under
contention.

## Database report

The schema is already well-indexed for hot paths (composite indexes on
`game_sessions(userId,createdAt)`, `game_results(userId,playedAt)`,
`wallet_transactions(walletId,createdAt)`, `leaderboard_entries(leaderboardId,rank)`,
unique `wallet_balances.walletId` with a `version` column for optimistic locking,
unique `wallet_transactions.idempotencyKey`). Findings:

| Area | Finding | Recommendation |
| --- | --- | --- |
| Leaderboard rank recompute | `recomputeRanks` issues N updates in one transaction | Acceptable for current scale; for very large boards switch to a single `UPDATE … FROM (SELECT rank() OVER …)` window query |
| Catalog reads | repeated per request | Mitigated — catalog cached in Redis (300s) by `RecommendationService` |
| N+1 | none detected | Prisma `include`/`select` used throughout; no per-row fetch loops |
| Large scans | fraud `scan()` reads recent sessions then assesses | Bounded with `take` (500 sessions, 50 accounts) |
| Lock contention | wallet writes | Per-wallet Redis lock + optimistic `version` check; Serializable txn with bounded retries |

No missing index is on a current hot path. Index recommendations above are
scale-out, not RC1 blockers; applying them needs a migration and is deferred to
avoid schema drift in this RC.

## Redis report

- **Locks:** per-wallet `SET key val PX ttl NX` with ordered acquisition (no
  deadlock) and token-checked release.
- **Caches:** AI catalog (300s TTL), wallet balance cache (invalidated on write),
  leaderboard sorted sets (`ZADD`/`ZREVRANGE`) with Postgres as source of truth.
- **Sessions:** game/wallet/crash/sports session records with 1h–7d TTL — bounded,
  self-expiring.
- No unbounded keys; every write path sets a TTL or is explicitly invalidated.

## Runtime report (`tools/profiling/profile.mjs`)

200,000 wallet settlements through the reference aggregate:

- Throughput **~52,000 settlements/sec**, books **conserved**, ledger **balanced**.
- Event-loop p99 lag **<1ms** under the steady load.
- CPU-bound (≈3.9s user / 0.17s system for 200k ops) — no blocking I/O on the path.
- GC: no long pauses observed during the run.

## Frontend report

- **Code splitting / lazy loading:** every heavy surface (card/roulette/dice/crash
  tables, casino + sportsbook play routes) is loaded via `next/dynamic` with
  `ssr:false` and a Spinner fallback, keeping first-load JS small.
- **Bundle sizes (representative, from `next build`):** shared first-load ≈102kB;
  route chunks are small (e.g. `/admin/ai` 4.3kB, `/discover` 3.9kB,
  `/wallet` 22.8kB incl. socket client, `/admin/operations` 6.2kB).
- **Realtime:** Socket.IO clients are created in `useEffect` and disconnected on
  unmount — no leaked connections across navigation.
- **Charts:** sparklines/graphs are hand-rolled SVG (no heavy charting dependency),
  keeping the bundle lean.
- **Rendering:** list rows keyed; expensive derivations wrapped in `useMemo`
  (bracket grouping, slip aggregation, cash-flow series).

## Memory report

- **Bounded buffers:** ops `Histogram` (ring reservoir, 4096), `LogBufferService`
  (ring, 1000), recommendation history caps, fraud scan caps. No unbounded growth.
- **Timers:** `QueueService` and `MonitoringService` clear all intervals in
  `onModuleDestroy`; the app enables shutdown hooks.
- **Listeners/sockets:** gateways authenticate and join rooms; clients disconnect
  on unmount; no per-request listener registration.
- **Note:** the in-memory `WalletLedgerEngine` (used by tests/profiler) retains
  journals + idempotency keys by design — the production wallet persists to
  Postgres, so this is **not** a production leak.

## API report

- Global `MetricsInterceptor` records `http_requests_total`,
  `http_request_duration_ms` (p50/p90/p95/p99) and `http_errors_total` per route,
  with high-cardinality ids collapsed (`/:id`, `/:n`) — overhead ≈ one histogram
  observe per request (>1M/sec capacity).
- Responses are gzip-compressed (`compression` middleware) and shaped by a
  transform interceptor; validation whitelists/strips unknown fields.
- Live API latency/throughput/error-rate are observable at
  `/admin/operations/overview` and scrapeable at `/admin/operations/metrics/prometheus`.

## Optimization log (applied — measured, behaviour-preserving)

| # | Change | Before | After | Impact |
| --- | --- | --- | --- | --- |
| 1 | `Histogram.snapshot()` sorts the sample array **once** instead of 4× (one per percentile) | metrics-observe scenario 1,745 ops/sec | **2,870 ops/sec** | **+64%** on the dashboard snapshot path; 4×→1× sorts |
| 2 | `recommend()` uses the `EMBED_DIM` constant instead of building a throwaway empty embedding per call | 6,649 ops/sec | 6,679 ops/sec | removes a per-call allocation (delta within noise; JIT already elided most of it) |

Both changes are pure refactors with identical outputs (covered by existing
`ops-core` / `ai-core` tests, still green).

## Remaining bottlenecks / opportunities

1. **Leaderboard rank recompute** → window-function `UPDATE` for very large boards.
2. **Real HTTP load run** requires a deployed instance + DB/Redis; `k6-load.js` is
   ready to gate it in staging.
3. **Connection pooling** sizing (Prisma `connection_limit`) should be tuned to the
   deploy topology (recommendation below).
4. **Histogram percentiles** are reservoir-exact (4096 samples); for very long
   windows consider HDR buckets if exact tail accuracy beyond the reservoir is
   needed.

## Production Readiness Score: 92 / 100

| Dimension | Score | Notes |
| --- | --- | --- |
| Correctness / integration | 19/20 | full E2E ledger-conserving journey passes |
| Performance (CPU paths) | 19/20 | sub-ms p99 across cores |
| Resilience | 18/20 | circuit breakers, retries, DLQ, optimistic locking, idempotency |
| Observability | 19/20 | metrics, tracing, logs, alerts, dashboards |
| Security hardening | 17/20 | helmet, RBAC, validation, rate limiting; pen-test pending |
| **Total** | **92/100** | |

Deductions are for items that can only be exercised against live infra (real 10k
HTTP load, external pen-test) — not code defects.

## Deployment recommendations

1. **Run `k6-load.js` in staging** at 1k/5k/10k stages; confirm p95<400ms / p99<1s.
2. **Prisma pool:** set `connection_limit` ≈ `(cpu_cores × 2 + effective_spindles)`
   per instance; front Postgres with PgBouncer (transaction pooling) at 10k VUs.
3. **Redis:** enable `maxmemory-policy allkeys-lru`; size for the session + lock +
   sorted-set working set; consider a dedicated instance for Socket.IO adapter.
4. **Socket.IO:** run the Redis adapter for multi-node broadcast fan-out.
5. **Scrape** `/admin/operations/metrics/prometheus` into Prometheus/Grafana; wire
   the default alert rules (already shipped) to your pager.
6. **Horizontal scale** the API (stateless) behind a load balancer; the wallet's
   optimistic locking + per-wallet Redis lock make it safe across instances.

## How to reproduce

```
pnpm -r --filter "./packages/*" build   # build cores
node tools/perf/bench.mjs               # load / throughput benchmark
node --expose-gc tools/profiling/profile.mjs   # runtime profile
pnpm test                               # unit + integration gates
# staging only:
BASE_URL=… TOKEN=… k6 run tools/load/k6-load.js
```
