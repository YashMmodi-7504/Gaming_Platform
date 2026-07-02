#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# One-shot local setup: installs deps, prepares env, starts infra, generates
# the Prisma client.
# -----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ Enabling pnpm via corepack…"
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@9.15.0 --activate >/dev/null 2>&1 || true

echo "▶ Installing dependencies…"
pnpm install

if [ ! -f .env ]; then
  echo "▶ Creating .env from .env.example…"
  cp .env.example .env
fi

echo "▶ Starting Postgres and Redis…"
docker compose -f docker/docker-compose.yml up -d postgres redis

echo "▶ Generating the Prisma client…"
pnpm db:generate

echo "✅ Setup complete. Run 'pnpm dev' to start the apps."
