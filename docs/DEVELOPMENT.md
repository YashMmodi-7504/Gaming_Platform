# Development Guide

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`corepack enable` then `corepack prepare pnpm@9.15.0 --activate`)
- **Docker** + **Docker Compose** (for Postgres/Redis or the full stack)

## First-time setup

```bash
pnpm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres redis
pnpm db:generate
pnpm dev
```

## Workspace scripts

All scripts run through Turborepo and respect the dependency graph.

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Watch-mode for every app              |
| `pnpm build`       | Build all packages and apps           |
| `pnpm lint`        | ESLint across the workspace           |
| `pnpm typecheck`   | `tsc --noEmit` across the workspace   |
| `pnpm format`      | Prettier write                        |
| `pnpm test`        | Unit tests                            |

## Targeting a single package

```bash
pnpm --filter @gaming-platform/backend dev
pnpm --filter @gaming-platform/frontend build
```

## Database workflow

The Prisma schema currently defines configuration only (no models).

```bash
pnpm db:generate          # regenerate the client
pnpm db:migrate           # create + apply a dev migration (after models exist)
pnpm db:studio            # open Prisma Studio
```

## Conventions

- **Commits** follow Conventional Commits (enforced by commitlint).
- **Pre-commit** runs lint-staged (ESLint + Prettier on staged files).
- **Pre-push** runs `pnpm typecheck`.
- Imports are ordered and types are imported with `import type`.
