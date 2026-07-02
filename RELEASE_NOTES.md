# Release Notes — Gaming Platform v1.0.0

**Release date:** 2026-06-30
**Status:** General Availability (GA)
**Codename:** Foundation

---

## Overview

This is the first General Availability release of the Gaming Platform — a
production-grade enterprise gaming system. Every planned capability is complete,
verified, and hardened across three release-candidate passes (performance,
security, deployment). This release contains **no experimental code, no
placeholders, and no known GA-blocking defects.**

## What's included

### Core platform
- Enterprise monorepo on pnpm + Turborepo, Node 20, strict TypeScript.
- Prisma-backed database layer with versioned, forward-only migrations.
- Authentication (email verification, password reset, refresh-token rotation,
  account lockout, TOTP 2FA, session limits) and RBAC authorization.
- Runtime SDK, Plugin SDK, Game Registry, and a dynamic game launcher.

### Game engines
- Card, Roulette, Dice, Crash, and Sports Betting engines.

### Financial & engagement
- Enterprise Wallet & Financial Engine — double-entry ledger, idempotency keys,
  optimistic locking, and per-wallet locking for safe concurrent writes.
- Transactions, ledger, Tournament platform, Leaderboards, and Rewards.

### Intelligence & operations
- Enterprise AI Platform and Operations Platform (metrics, alerts, dashboards,
  reconciliation), real-time delivery over Socket.IO, notifications, mailer, and
  a full admin console.

### Frontend
- Next.js 15 app-router experience (standalone build) spanning marketing, auth,
  casino, dashboard, game, and admin surfaces — with dark mode, skeletons,
  error/empty states, and a global error boundary.

## Hardening highlights

| Pass | Focus | Reference |
| --- | --- | --- |
| RC1 | Performance — startup, throughput, latency; bench/load/profiling harnesses | `docs/release-candidate-1.md` |
| RC2 | Security — Helmet/CSP, CORS allow-list (HTTP + WS), secure cookies, JWT, rate limits, log redaction, wallet concurrency safety | `docs/release-candidate-2-security.md` |
| RC3 | Deployment/DevOps — non-root container images (tini + HEALTHCHECK), compose + prod override, CI/CD with audit/CodeQL/release/rollback, scanned SBOM-attested images | `docs/release-candidate-3-deployment.md` |

## Certification

All certification gates pass on this release:

| Gate | Result |
| --- | --- |
| `pnpm prisma:generate` | ✓ |
| `pnpm typecheck` | ✓ 35/35 tasks |
| `pnpm lint` | ✓ 35/35 tasks |
| `pnpm test` | ✓ 19 suites · 77 tests |
| `pnpm build` | ✓ 18/18 tasks |

See `FINAL_CERTIFICATION.md` and `docs/final-release-report.md` for the full
report, production-readiness score, and Go/No-Go recommendation.

## Upgrade / install

This is the initial release; there is no upgrade path from a prior version.
Deploy per `docs/release-candidate-3-deployment.md`:

1. Provision Postgres and Redis.
2. Set environment variables (`.env.production`); inject secrets via your secret
   store. Ensure `SWAGGER_ENABLED=false`, `AUTH_COOKIE_SECURE=true`, and exact
   `CORS_ORIGINS`.
3. Run database migrations (`prisma migrate deploy` / the compose `migrate`
   profile).
4. Deploy the published container images with a zero-downtime (`start-first`)
   strategy and verify health endpoints.
5. Run the smoke-test checklist.

## Breaking changes

None — this is the initial GA release.

## Known limitations

None are GA-blocking. See `docs/final-release-report.md` § Known Limitations for
the full list and the post-GA roadmap.

## Support

Licensing and support: info@logicrest.ai
