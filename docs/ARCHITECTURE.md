# Architecture

## Overview

The platform is a **Turborepo** monorepo managed with **pnpm** workspaces. It is
split into deployable applications (`apps/*`), shared libraries (`packages/*`),
and future game modules (`games/*`).

```
┌─────────────────────────────────────────────────────────────┐
│                          Nginx (80)                          │
│        /  → frontend     /api,/docs,/realtime → backend       │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
        ┌───────▼────────┐         ┌───────▼────────┐
        │  Frontend      │  HTTP   │   Backend      │
        │  Next.js 15    │ ───────▶│   NestJS       │
        │  (port 3000)   │  WS     │   (port 4000)  │
        └────────────────┘         └───┬────────┬───┘
                                       │        │
                               ┌───────▼─┐   ┌──▼──────┐
                               │ Postgres│   │  Redis  │
                               └─────────┘   └─────────┘
```

## Packages

| Package                      | Responsibility                                         |
| ---------------------------- | ------------------------------------------------------ |
| `@gaming-platform/types`     | Framework-agnostic TypeScript contracts                |
| `@gaming-platform/shared`    | Utilities, constants, Zod schemas, error primitives    |
| `@gaming-platform/config`    | Shared ESLint / Prettier / TS configs                  |
| `@gaming-platform/auth`      | Password hashing, JWT helpers, RBAC                    |
| `@gaming-platform/database`  | Prisma schema + generated client                       |
| `@gaming-platform/ui`        | shadcn/ui-based React component library                |

Shared libraries are compiled with **tsup** to dual ESM/CJS output so they can
be consumed by both the CommonJS backend and the ESM frontend. The UI package is
consumed as source and transpiled by Next.js.

## Backend

NestJS with a strict modular structure. Cross-cutting concerns are global:

- **Config** — layered `.env`, validated at boot with Zod
- **Logging** — Winston (pretty in dev, JSON + rotation in prod)
- **Errors** — a single `AllExceptionsFilter` normalizes every error
- **Responses** — a `TransformInterceptor` wraps payloads in a standard envelope
- **Security** — Helmet, CORS, global JWT guard, RBAC guard, rate limiting
- **Validation** — global `ValidationPipe` (whitelist + transform)
- **Versioning** — URI versioning under `/<prefix>/v<version>`
- **Realtime** — Socket.IO gateway on the `/realtime` namespace

Domain modules (`users`, `games`, `wallet`, `transactions`, `notifications`,
`admin`, `analytics`) are wired with final service/controller contracts.
Persistence activates when the Prisma data model is introduced.

## Frontend

Next.js 15 App Router with route groups for each layout:

| Route group   | Layout              |
| ------------- | ------------------- |
| `(marketing)` | Public landing      |
| `(auth)`      | Split auth screens  |
| `(dashboard)` | Sidebar + header    |
| `(game)`      | Immersive full-bleed|
| `admin`       | Admin console       |

State is split between **Zustand** (client UI/session) and **React Query**
(server state). Forms use **React Hook Form** + **Zod**. The design system is
dark-first with a light opt-in.
