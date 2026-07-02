# Release Candidate 2 — Security, Reliability & Production Readiness Audit

Role: Principal Security Engineer / Staff Platform Engineer. Scope: audit, verify,
harden and document. **Only backwards-compatible changes** — no new features, no
architecture change.

## Executive summary

The platform entered RC2 with a **strong security baseline**: layered global
guards (throttle → JWT → roles → permissions), bcrypt password hashing with a
configurable cost, hardened auth cookies, strict input validation with
whitelisting, helmet, gzip, a centralized exception filter that never leaks
internals, server-authoritative game engines, an idempotent + optimistically
locked wallet, and full observability.

The audit found **no critical or high application-code vulnerabilities**. Two
real, safe hardening gaps were fixed; the remaining items are transitive
dependency advisories (low real-world exploitability for this app) for which a
vetted upgrade plan is provided rather than a risky in-audit bump.

**Production Readiness (security): 90 / 100.**

| Verification | Result |
| --- | --- |
| `pnpm typecheck` | ✓ 35 tasks |
| `pnpm lint` | ✓ 35 tasks, zero warnings |
| `pnpm test` | ✓ 29 tasks — incl. new redaction control test (19 backend suites / 77 tests) |
| `pnpm build` | ✓ 18 tasks |

## Architecture review

Defense-in-depth is correctly layered and unchanged:

- **Global guards** (`app.module.ts`): `ThrottlerGuard` → `JwtAuthGuard` →
  `RolesGuard` → `PermissionsGuard`. Public routes opt out via `@Public()`;
  privileged routes require explicit `@RequirePermissions(...)`.
- **Engines are server-authoritative** — provably-fair seeds, crash points and
  bracket advancement are computed and held server-side; the crash gateway never
  discloses the crash time to clients.
- **Wallet** is the only money mutator: per-wallet Redis lock + optimistic
  `version` check + unique `idempotencyKey` + Serializable transactions →
  replay-, race- and double-spend-safe (proven by the 10k-concurrency test).

## Security findings & fixes

### Applied (this audit — backwards-compatible)

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| S-1 | **Sensitive data could reach logs.** Winston wrote metadata verbatim; an accidental `logger.x('...', { token })` would persist a secret. | Medium (A09) | Added a Winston **redaction format** applied to every transport that recursively scrubs `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`, `apiKey`, `idempotencyKey`, `serverSeed`, `clientSeed`, card/CVV at any depth. Locked with a regression test. |
| S-2 | **Permissive WebSocket CORS.** All 9 gateways used `cors:{origin:true,credentials:true}`, reflecting any origin. | Low–Medium (A05) | Introduced `wsCorsOptions` derived from `CORS_ORIGINS` (same allow-list as HTTP). Restricts cross-origin WS in production; unchanged (`true`) when `CORS_ORIGINS` is unset (dev). |

Both fixes are pure, additive and covered by passing tests/typecheck/lint.

### Verified safe (no change needed)

| Area | Finding |
| --- | --- |
| Authentication | bcrypt via `@gaming-platform/auth` with configurable cost (default 12); common-password + identity-derived rejection; strength meter. |
| Token handling | Access token in memory; **refresh token in `httpOnly`, `secure`, `sameSite=lax` cookie** with bounded `maxAge`; signed with separate access/refresh secrets. |
| Session management | Game/wallet sessions in Redis with TTLs; ownership enforced (`record.userId !== userId → Forbidden`). |
| Authorization / RBAC | Permission-checked admin endpoints (`analytics:read`, `wallets:adjust`, `settings:write`, `games:write`); super-admin bypass is explicit. |
| IDOR | User reads scoped by `userId` (e.g. `walletTransaction` `where:{id,userId}`); sessions verify ownership. No object-id-only lookups on user routes. |
| Injection (SQLi) | Prisma parameterized queries throughout; NL search uses `contains`/`mode:insensitive` (parameterized), no string-built SQL. |
| Mass assignment | Global `ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true })` strips/blocks unknown fields. |
| Error handling | `AllExceptionsFilter` returns generic `Internal server error` for unknown exceptions; **stack/internal messages are logged server-side only**, never returned. |
| CSRF | State-changing APIs are JWT-bearer (header), not cookie-auth; refresh cookie is `sameSite=lax` + `httpOnly`. |
| Clickjacking | `helmet` sets `X-Frame-Options`/frame-ancestors; CSP enabled in production. |
| Open redirects | None — no `res.redirect` with user-controlled targets. |
| SSRF | Only outbound call is the optional Claude API (fixed URL, config-gated). |
| Rate limiting | Global `ThrottlerGuard` + strict per-endpoint throttles on auth (login 5/min, reset 3/min, etc.). |
| Replay protection | Provably-fair nonce per round + wallet `idempotencyKey`; settlements idempotent. |
| Concurrency | Optimistic `version` + Redis locks + Serializable txns; zero-corruption proven under 10k concurrent ops. |
| Secrets | Validated at boot (Zod); JWT secrets ≥16 chars (**recommend ≥32 in prod — see below**); no secrets in code. |
| Swagger | Config-gated (`SWAGGER_ENABLED`); disable in production. |
| Metrics/Prometheus | Behind `analytics:read`; not public. |

## OWASP Top 10 (2021) review

| Risk | Status | Notes |
| --- | --- | --- |
| A01 Broken Access Control | ✅ | Layered guards, per-resource ownership checks, RBAC; no IDOR found. |
| A02 Cryptographic Failures | ✅ | bcrypt; httpOnly+secure cookies; HMAC provably-fair; TLS at the edge (deploy). |
| A03 Injection | ✅ | Prisma parameterization; validation/whitelisting; no eval/raw SQL on user input. |
| A04 Insecure Design | ✅ | Server-authoritative engines; wallet idempotency/locking; lifecycle state machines. |
| A05 Security Misconfiguration | ⚠️→✅ | **Fixed** WS CORS (S-2); helmet/CSP on; Swagger gated. |
| A06 Vulnerable Components | ⚠️ | Transitive advisories — remediation plan below (no app-code exposure). |
| A07 Auth Failures | ✅ | Throttled login, lockout fields, 2FA support, strong password policy. |
| A08 Data Integrity Failures | ✅ | Idempotent settlements; double-entry ledger reconciliation; signed tokens. |
| A09 Logging/Monitoring Failures | ⚠️→✅ | **Fixed** log redaction (S-1); full metrics/alerts/tracing already present. |
| A10 SSRF | ✅ | No user-controlled outbound requests. |

## Dependency audit

`pnpm audit --prod`: **23 advisories (7 high, 15 moderate, 1 low)**, all in
**transitive** dependencies of `@nestjs/*` / `platform-express` / `swagger` /
`mailer`, none on a directly-exploitable application path:

| Package | Sev | Path (transitive via) | Patched | App exposure |
| --- | --- | --- | --- | --- |
| `multer` | high | `@nestjs/platform-express` | ≥2.2.0 | No user file-upload endpoints in scope |
| `nodemailer` | high/mod/low | `mailer` | ≥9.0.1 | `envelope.size` not user-controlled |
| `lodash` | high/mod | transitive build deps | latest 4.17.x | Not used on user input paths |
| `qs` | moderate | `express` | ≥6.15.2 | Query parsing — mitigated by validation |
| `postcss` | moderate | build toolchain (dev) | ≥8.5.10 | Build-time only |
| `js-yaml` | moderate | `@nestjs/swagger` | ≥4.2.0 | Doc generation only, gated |
| `file-type` | moderate | transitive | ≥21.3.2 | Not on user path |
| `@nestjs/core` | moderate | framework | ≥11.1.18 | Framework patch |

**Decision:** dependency versions were **not** mutated during the audit.
Forcing transitive overrides risks breaking install/build (several "patched"
targets are major bumps under the framework, and some advisory targets exceed the
latest published version). The correct, validated remediation — run in CI with
the full gate suite — is:

```jsonc
// root package.json (apply, then `pnpm install && pnpm -r build && pnpm -r test`)
"pnpm": {
  "overrides": {
    "qs@>=6.11.1 <=6.15.1": ">=6.15.2",
    "postcss@<8.5.10": ">=8.5.10",
    "@nestjs/core": ">=11.1.18"
  }
}
// Framework majors (multer ≥2.2.0 via platform-express, nodemailer ≥9, js-yaml
// via swagger) require coordinated @nestjs upgrades — schedule and re-run tests.
```

No deprecated libraries or license conflicts (all deps MIT/ISC/Apache-2.0; repo is
UNLICENSED/private). No unused production dependencies detected.

## API audit

Every REST endpoint inherits the global guard chain; spot-audit of representative
routes confirmed:

- **AuthN/AuthZ**: user routes require a valid JWT (`@CurrentUser`); admin routes
  add `@RequirePermissions`; `@Public()` is used only for genuinely public reads
  (catalog, status, fairness verification).
- **Validation**: every body is a DTO with class-validator; query params typed;
  unknown fields rejected.
- **Error handling / status codes**: centralized filter → consistent
  `{statusCode,message,error,errors,traceId}`; correct 400/401/403/404/409.
- **Sensitive data**: responses are field-shaped (e.g. wallet views expose
  balances, never seeds/secrets); the server seed is revealed only on session end
  for fairness verification.
- **Rate limiting**: global + strict on auth.

## Database audit

- **Indexes**: hot paths covered (composite `(userId,createdAt)` on sessions,
  `(walletId,createdAt)` on transactions, `(leaderboardId,rank)`, unique
  `walletBalance.walletId` + `version`, unique `idempotencyKey`).
- **Transactions**: wallet writes are Serializable with bounded optimistic
  retries; ledger postings are atomic and balanced (`Σ debit = Σ credit`,
  verifiable via `/admin/wallet/reconcile`).
- **Migration safety**: additive Prisma schema; no destructive changes in RC1/RC2.
- **Connection handling**: single Prisma client with lifecycle hooks; pool sizing
  is a deploy-time tuning (PgBouncer recommended at scale).
- **Locking**: optimistic `version` + per-wallet Redis lock; ordered lock
  acquisition prevents deadlock.
- **Backups/restore**: operational responsibility — see production checklist.

## Cache review

- **Invalidation**: wallet balance cache deleted on every write; AI catalog TTL
  300s; leaderboard sorted sets refreshed on submit with Postgres as source of
  truth.
- **TTL strategy**: every Redis key sets a TTL or is explicitly invalidated; no
  unbounded keys.
- **Memory / eviction**: recommend `maxmemory-policy allkeys-lru` (deploy).
- **Failure handling**: health checks degrade gracefully; ops alerts on
  `redis_up < 1`; locks fail closed (operation rejected, not silently skipped).

## Observability review

Structured JSON logging (now redacted), Prometheus-exportable metrics, request
tracing (`x-trace-id`), configurable alert rules with incident tracking, deep
health + dependency graph, and runbooks in `docs/operations-platform.md`. No
gaps.

## Performance review

Per RC1 (`docs/release-candidate-1.md`): sub-millisecond p99 across the engine
cores; >50k wallet settlements/sec/process; gzip compression; lazy-loaded heavy
frontend routes (≈102kB shared first-load). The RC2 redaction format adds a
shallow recursive walk only to log payloads (not request paths) — negligible
overhead. Startup is unaffected.

## Operational risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Transitive CVEs | Apply the vetted override plan in CI; schedule framework majors. |
| Weak JWT secret in prod | Enforce ≥32-char secrets via secrets manager; rotate. |
| WS origin spoofing | **Fixed** — set `CORS_ORIGINS` in production. |
| Secret leakage in logs | **Fixed** — redaction format + test. |
| DB connection exhaustion at scale | PgBouncer (transaction pooling) + tuned `connection_limit`. |
| Redis memory pressure | `allkeys-lru` + sized working set; multi-node Socket.IO adapter. |

## Production checklist

- [ ] Set `CORS_ORIGINS` to the exact trusted front-end origins.
- [ ] JWT access/refresh secrets ≥32 chars from a secrets manager; rotate periodically.
- [ ] `SWAGGER_ENABLED=false` (or auth-gate) in production.
- [ ] `NODE_ENV=production` (enables CSP, JSON logs, minimal error format).
- [ ] TLS terminated at the edge; HSTS enabled.
- [ ] Apply the dependency override plan; re-run `pnpm test && pnpm build`.
- [ ] Postgres: PgBouncer + tuned pool; automated backups + tested restore (PITR).
- [ ] Redis: `maxmemory-policy allkeys-lru`; persistence/replication per RPO.
- [ ] Scrape `/admin/operations/metrics/prometheus`; wire default alerts to pager.
- [ ] Confirm rate-limit thresholds match expected production traffic.

## Production readiness (security): 90 / 100

| Dimension | Score | Notes |
| --- | --- | --- |
| Access control | 19/20 | layered guards, ownership checks, no IDOR |
| Crypto & secrets | 18/20 | bcrypt, hardened cookies; raise prod secret length |
| Injection & validation | 19/20 | parameterized + whitelisted |
| Logging & monitoring | 18/20 | redaction added; full observability |
| Dependencies | 16/20 | transitive CVEs, remediation scheduled |
| **Total** | **90/100** | |

## Remaining recommendations

1. Apply the dependency override plan + framework majors in CI; re-audit to zero highs.
2. Raise JWT secret minimum to 32 chars (enforced in production config).
3. Consider `sameSite=strict` for the refresh cookie if no cross-site flows need lax.
4. Add an automated `pnpm audit` gate to CI to catch new advisories.
5. Schedule an external penetration test before GA.
