# Changelog

All notable changes to the Gaming Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-06-30

First General Availability release. All planned platform capabilities are
complete, verified, and production-ready. No experimental code ships in this
release.

### Added — Platform Foundation
- Enterprise monorepo (pnpm + Turborepo), Node 20, strict TypeScript.
- Enterprise database layer (Prisma) with versioned, forward-only migrations.
- Authentication: registration, login, email verification, password reset,
  refresh-token rotation, account lockout, 2FA (TOTP), concurrent-session limits.
- Authorization: role-based access control (RBAC) with global guards.
- Runtime SDK and Plugin SDK for game integration.
- Game Registry and dynamic game launcher.

### Added — Game Engines
- Card Engine.
- Roulette Engine.
- Dice Engine.
- Crash Engine.
- Sports Betting Engine.

### Added — Financial & Engagement
- Enterprise Wallet & Financial Engine with double-entry ledger, idempotency
  keys, optimistic locking, and per-wallet locking for safe concurrent writes.
- Transactions and ledger with full audit trail.
- Tournament Platform.
- Leaderboards.
- Rewards.

### Added — Intelligence & Operations
- Enterprise AI Platform.
- Enterprise Operations Platform (metrics, alerts, dashboards, reconciliation).
- Real-time delivery over Socket.IO with a Redis adapter path for multi-node.
- Notifications and transactional mailer.
- Admin console covering every module.

### Added — Frontend
- Next.js 15 app-router frontend (standalone output) with 50+ routes across
  marketing, auth, casino, dashboard, game, and admin surfaces.
- Dark mode, loading/skeleton states, error and empty states, error boundary
  (`error.tsx`), global `loading.tsx`, and `not-found.tsx`.
- Responsive layouts (desktop, tablet, mobile).

### Hardening — Release Candidates
- **RC1 — Performance:** load/bench/profiling harnesses (`tools/perf`,
  `tools/load`, `tools/profiling`); validated startup, throughput, and latency
  targets. See `docs/release-candidate-1.md`.
- **RC2 — Security:** Helmet headers + CSP, strict CORS allow-list (HTTP and
  WebSocket), secure cookies, JWT access/refresh hardening, rate limiting,
  structured log redaction of secrets/PII, wallet idempotency and optimistic
  locking. See `docs/release-candidate-2-security.md`.
- **RC3 — Deployment & DevOps:** multi-stage non-root container images with
  `tini` init and `HEALTHCHECK`; docker-compose with healthchecks, dependency
  ordering, and a profile-gated migration service; production compose override
  with resource limits, replicas, zero-downtime (`start-first`) updates, and
  auto-rollback; CI with typecheck/lint/test/build + dependency audit; release,
  rollback, and CodeQL workflows publishing scanned, SBOM-attested images to
  GHCR. See `docs/release-candidate-3-deployment.md`.

### Security
- Security headers, CSP, CORS, rate limiting, and secret/PII log redaction
  verified in the final review (see `docs/final-release-report.md`).
- CodeQL SAST and dependency auditing wired into CI.
- Container images scanned with Trivy and published with provenance + SBOM.

### Operations
- Health endpoints: `/api/v1/health` (deep), `/api/v1/health/liveness`,
  `/operations/status`.
- Prometheus metrics, structured JSON logs, OpenTelemetry tracing hook, Sentry
  error-reporting hook.
- Backup/restore, disaster-recovery, incident-response, and maintenance runbooks.

### Release Engineering (GA polish)
- Added `prisma:generate` script alias (→ `db:generate`) for documented parity.
- Added project release artifacts: `VERSION`, `LICENSE`, `NOTICE`,
  `CONTRIBUTORS`, `CHANGELOG.md`, `RELEASE_NOTES.md`.
- Added `docs/final-release-report.md` and `FINAL_CERTIFICATION.md`.

### Known Limitations
See `docs/final-release-report.md` § Known Limitations. None are GA-blocking.

[1.0.0]: https://github.com/logicrest/gaming-platform/releases/tag/v1.0.0
