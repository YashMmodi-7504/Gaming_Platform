# Release Candidate 3 — Deployment, Infrastructure & Operations

Role: Principal DevOps / Platform / SRE. Scope: infrastructure, CI/CD, deployment,
database operations and runbooks. **Backwards-compatible only** — no feature or
behaviour changes.

## Executive summary

The platform already shipped solid infra: multi-stage non-root Docker images with
Turborepo pruning, a full `docker-compose` stack with DB/Redis/backend
healthchecks, a CI pipeline, Dependabot, and a complete typed env-config layer
(CORS, JWT, cookies, OTEL/Sentry hooks). RC3 closes the remaining operational
gaps with **additive, backwards-compatible** changes and full runbooks.

**Deployment readiness: 93 / 100.**

| Verification | Result |
| --- | --- |
| `pnpm typecheck` | ✓ 35 tasks |
| `pnpm lint` | ✓ 35 tasks |
| `pnpm test` | ✓ 29 tasks |
| `pnpm build` | ✓ 18 tasks |
| Workflow + compose YAML | ✓ all parse |

### Infrastructure improvements applied (RC3)

| # | Area | Change |
| --- | --- | --- |
| I-1 | Containers | Added `tini` init (correct SIGTERM → graceful shutdown, zombie reaping) to backend + frontend images. |
| I-2 | Containers | Added `HEALTHCHECK` to both images (backend → `/health/liveness`, frontend → `/`). |
| I-3 | Compose | Added a **frontend healthcheck**; frontend now waits for `backend: service_healthy`. |
| I-4 | Compose | Added a profile-gated **`migrate`** one-shot service (`prisma migrate deploy`). |
| I-5 | Compose | New `docker-compose.prod.yml` override: resource limits/reservations, 2× replicas, **`start-first` zero-downtime** updates + auto-rollback, log rotation, Redis `allkeys-lru`. |
| I-6 | CI | Added the missing **`pnpm test`** step to the pipeline. |
| I-7 | CI | Added a **dependency-audit** job (reports all, gates on `critical`). |
| I-8 | CI | New **`release.yml`** — build + SBOM/provenance + Trivy scan + push to GHCR on `v*` tags + GitHub Release. |
| I-9 | CI | New **`rollback.yml`** — `workflow_dispatch` to re-tag a known-good image as `:rollback`/`:latest`. |
| I-10 | CI | New **`codeql.yml`** — SAST for TypeScript/JavaScript on push/PR + weekly. |

## Architecture overview

Stateless Node services behind nginx; stateful Postgres + Redis.

```
            ┌───────────────────────── nginx (TLS, gzip, routing) ─────────────────────────┐
 Internet ─▶│  /            → frontend (Next.js standalone, :3000, N replicas)             │
            │  /api, /socket → backend  (NestJS, :4000, N replicas)                         │
            └───────────────┬──────────────────────────────┬──────────────────────────────┘
                            ▼                               ▼
                    Postgres 16 (primary           Redis 7 (cache, locks,
                    + replicas, PgBouncer)         sorted sets, Socket.IO adapter)
```

Backend and frontend are **stateless** (sessions/locks live in Redis; data in
Postgres) → scale horizontally. The wallet's optimistic locking + per-wallet Redis
lock + idempotency keys make multi-instance writes safe.

## Deployment topology

| Tier | Backend | Frontend | Postgres | Redis |
| --- | --- | --- | --- | --- |
| Development | 1 (compose) | 1 | 1 | 1 |
| Staging | 2 | 1 | 1 + PITR | 1 |
| Production | ≥2 (autoscale) | ≥2 | primary + ≥1 replica + PgBouncer | clustered/replicated |

Compose is the reference topology; the same images run on Kubernetes (probes map
1:1 to the container `HEALTHCHECK`) or Swarm (uses the `deploy:` keys in the prod
override directly).

## Environment configuration

Config is fully typed and **validated at boot** (Zod, `env.validation.ts`); boot
fails fast on a missing/invalid var. Files: `.env.example` (template),
`.env.development`, `.env.staging`, `.env.production` (overrides loaded by
`NODE_ENV`). Key production values:

| Var | Production value |
| --- | --- |
| `NODE_ENV` | `production` (enables CSP, JSON logs, minimal errors) |
| `CORS_ORIGINS` | exact trusted front-end origins (also restricts WebSockets — RC2) |
| `AUTH_COOKIE_SECURE` | `true` |
| `SWAGGER_ENABLED` | `false` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32 chars from a secrets manager |
| `DATABASE_URL` | points at PgBouncer; `?connection_limit=…&pool_timeout=…` |
| `REDIS_URL` / `REDIS_PASSWORD` | managed Redis with auth + TLS |
| `OTEL_EXPORTER_OTLP_ENDPOINT` / `SENTRY_DSN` | tracing + error reporting |

**Secrets management:** never commit secrets. Inject via the platform's secret
store — Kubernetes Secrets (mounted as env), Docker Swarm secrets, or a managed
vault (AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault). The compose
`env_file: ../.env` is for local/staging only.

## CI/CD workflow

```
push / PR ──▶ CI (ci.yml)            : install → prisma generate → typecheck → lint → test → build
            │  audit job             : pnpm audit (report; gate on critical)
            │  docker job            : build backend + frontend images
            ▼
push / PR ──▶ CodeQL (codeql.yml)    : SAST (TS/JS), weekly schedule
            ▼
tag v* ─────▶ Release (release.yml)  : buildx (cache) → SBOM + provenance → Trivy scan → push GHCR → GitHub Release
            ▼
manual ─────▶ Rollback (rollback.yml): re-tag known-good GHCR image → :rollback / :latest
```

Images publish to `ghcr.io/<owner>/<repo>-{backend,frontend}` tagged with the
semver, `major.minor`, the commit SHA and `latest`.

## Container strategy

- **Multi-stage** with `turbo prune --docker` → minimal build context + optimal
  layer caching (manifests/lockfile copied before source).
- **Non-root**: runs as `nestjs`/`nextjs` (uid 1001); read-only-friendly.
- **Next.js standalone** output → tiny runtime with only required `node_modules`.
- **`tini` init** → SIGTERM reaches Node, `enableShutdownHooks()` drains
  connections, timers/intervals are cleared (queue, monitoring).
- **`HEALTHCHECK`** → orchestrators detect unhealthy tasks and replace them.
- **Build cache** in CI via `type=gha`; **SBOM + provenance** attestations on
  release images; **Trivy** scan gate available.

Recommendation (deferred, non-blocking): a `--prod` dependency prune in the
backend runtime stage to further shrink the image / attack surface — validate
against the full test suite before adopting.

## Database operations

### Migration workflow

Migrations are versioned Prisma migrations. **Run before deploying** new app code:

```bash
# compose
docker compose -f docker/docker-compose.yml --profile migrate run --rm migrate
# kubernetes (Job / initContainer)
pnpm --filter @gaming-platform/database exec prisma migrate deploy
```

`prisma migrate deploy` is **forward-only and idempotent** — it applies pending
migrations and is safe to re-run. Schema changes shipped so far are **additive**
(new tables/columns/indexes, an enum value extension) → no destructive locks,
compatible with rolling deploys (deploy migration first, then new app).

### Rollback strategy

- **App rollback:** re-deploy the previous image tag (Rollback workflow / `kubectl
  rollout undo` / compose with `IMAGE_TAG`). Stateless → instant.
- **Schema rollback:** prefer **forward fixes** (a new corrective migration).
  Because RC migrations are additive, the previous app version keeps working
  against the new schema, so an app rollback rarely needs a schema rollback. If a
  destructive change is ever required, ship it in **two phases** (expand →
  contract) so each app version is compatible with both schemas.

### Backup & restore

```bash
# Backup (nightly + before each migration) — custom format, parallel.
pg_dump --format=custom --jobs=4 --file=backup-$(date +%F).dump "$DATABASE_URL"
# Restore into a fresh database.
pg_restore --clean --if-exists --jobs=4 --dbname="$DATABASE_URL" backup-YYYY-MM-DD.dump
```

- Enable **continuous archiving / PITR** (WAL) in managed Postgres; target RPO ≤ 5
  min, RTO ≤ 30 min.
- **Test restores** monthly into a scratch DB (a backup is only real once restored).
- Redis is a cache + ephemeral session/lock store; AOF persistence is enabled, but
  Redis is **not** the source of truth — it can be rebuilt. Wallet/ledger truth is
  in Postgres.

### Connection pooling

- Front Postgres with **PgBouncer** (transaction pooling) at scale; point
  `DATABASE_URL` at it.
- Prisma `connection_limit` ≈ `min(physical_pool, num_cpu × 2 + 1)` **per
  instance**; keep `Σ instances × connection_limit` below Postgres `max_connections`
  (PgBouncer absorbs the multiplexing).

### Disaster recovery

| Scenario | Procedure | RTO/RPO |
| --- | --- | --- |
| Bad deploy | Rollback workflow → previous image | RTO ≈ minutes, RPO 0 |
| DB corruption / loss | PITR restore to last good LSN | RTO ≤ 30m, RPO ≤ 5m |
| Region outage | Promote standby replica in DR region; repoint DNS | per failover runbook |
| Redis loss | Re-create instance; sessions re-auth, locks reset, caches rewarm | RTO ≈ minutes |

## Scaling recommendations

| Component | Strategy |
| --- | --- |
| Backend | Horizontal (stateless); HPA on CPU 60–70% / p95 latency; start at 2, headroom to N. |
| Frontend | Horizontal (stateless); CDN for static assets. |
| Realtime | Socket.IO **Redis adapter** for multi-node broadcast fan-out. |
| Postgres | Vertical first; read replicas for analytics/leaderboard reads; PgBouncer. |
| Redis | Replica + (optional) cluster; `maxmemory-policy allkeys-lru` (set in prod override). |

Per-container limits (prod override, tune to hosts): backend 1.5 CPU / 1G,
frontend 1 CPU / 768M, Postgres 2 CPU / 2G, Redis 1 CPU / 768M.

## Monitoring integration

- **Health:** `/api/v1/health` (deep), `/api/v1/health/liveness`,
  `/operations/status` (public). Container `HEALTHCHECK` uses liveness; K8s
  readiness should use the deep `/health`.
- **Metrics:** Prometheus text at `/admin/operations/metrics/prometheus`
  (scrape into Prometheus/Grafana).
- **Logs:** structured JSON (with RC2 redaction) → ship to your aggregator
  (Loki/ELK/CloudWatch) via the container stdout + json-file rotation.
- **Tracing:** `OTEL_EXPORTER_OTLP_ENDPOINT` hook + per-request `x-trace-id`.
- **Errors:** `SENTRY_DSN` hook.
- **Alerts:** default rules ship in the Operations platform; wire `operations:alert`
  events / Prometheus alertmanager to your pager. Runbooks:
  `docs/operations-platform.md`.

## Release checklist

- [ ] CI green on the release commit (typecheck, lint, **test**, build, audit, CodeQL).
- [ ] Tag `vX.Y.Z`; confirm `release.yml` pushed scanned images to GHCR.
- [ ] **Run the migration** (`--profile migrate` / migrate Job) — verify it succeeds.
- [ ] Deploy with `start-first` (zero-downtime); watch healthchecks go green.
- [ ] Smoke test: login, place a demo bet, wallet balance, a tournament page, ops dashboard.
- [ ] Confirm metrics flowing + no new firing alerts; error rate < 1%, p95 < target.
- [ ] Verify `CORS_ORIGINS`, `SWAGGER_ENABLED=false`, `AUTH_COOKIE_SECURE=true` in the deployed env.
- [ ] Take a fresh DB backup post-deploy.

## Rollback procedures

1. **Trigger** the *Rollback* workflow with the last known-good `vX.Y.(Z-1)` (and
   `promote_latest` if your deploy tracks `:latest`).
2. **Re-deploy** the previous tag: `kubectl rollout undo deploy/backend` (and
   frontend), or `IMAGE_TAG=vX.Y.(Z-1) docker compose ... up -d`.
3. **Schema:** no action if the migration was additive (previous app is
   compatible). If not, apply the prepared corrective (contract) migration.
4. **Verify** healthchecks + smoke test; confirm alerts clear.
5. **Post-mortem:** capture the trace ids / metrics window and file an incident.

## Operational runbooks

**Deployment** — migrate → deploy `start-first` → watch health → smoke test →
backup. Abort & rollback on any failed healthcheck or error-rate spike.

**Incident response** — page on critical alert (DB/Redis down, failed
settlements, wallet inconsistency) → check `/admin/operations/overview` → identify
hot route via `http_request_duration_ms` p95 → mitigate (scale / circuit-break /
rate-limit) → if release-induced, **rollback** → reconcile wallet via
`/admin/wallet/reconcile` → write the post-mortem.

**Disaster recovery** — see the DR table; rehearse the PITR restore quarterly.

**Routine maintenance** — weekly: review CodeQL + audit findings, rotate logs
(automatic), check backup restores. Monthly: dependency upgrade window (apply the
RC2 override plan, re-run CI), restore drill. Quarterly: secret rotation, DR
failover rehearsal, load test (`tools/load/k6-load.js`).

## Deployment readiness: 93 / 100

| Dimension | Score | Notes |
| --- | --- | --- |
| Containerization | 19/20 | non-root, multi-stage, healthcheck, init; prod-prune optional |
| CI/CD | 19/20 | tests + audit + CodeQL + release + rollback |
| Deployment strategy | 19/20 | zero-downtime start-first, blue/green & canary documented |
| Database ops | 18/20 | migration/rollback/backup/restore/DR documented; PITR is deploy-time |
| Observability | 18/20 | health/metrics/logs/tracing/alerts/runbooks complete |
| **Total** | **93/100** | |

## Blue/Green & Canary (documentation)

- **Blue/Green:** run two identical stacks (blue=current, green=new). Migrate
  (additive) → deploy green → smoke test green via a private hostname → switch the
  nginx/LB upstream (or Service selector) to green → keep blue warm for fast
  rollback → decommission blue after a soak.
- **Canary:** route a small weighted slice (e.g. 5–10%) of traffic to the new
  version via the LB/ingress; watch error rate + p95 + business KPIs on the ops
  dashboard; ramp 10→50→100% on green metrics, or auto-rollback on regression.
- The compose prod override's `start-first` update already gives **rolling
  zero-downtime** for the single-stack case.

## Remaining recommendations

1. Adopt the backend `--prod` dependency prune (validate, then enable) for a
   smaller runtime image.
2. Apply the RC2 dependency-override remediation, then raise the CI audit gate
   from `critical` → `high`.
3. Add Kubernetes manifests / Helm chart (probes map to the existing healthchecks)
   if deploying on K8s.
4. Enable the Socket.IO Redis adapter when running >1 backend replica.
5. Wire Prometheus Alertmanager + the shipped alert rules to the on-call pager.
