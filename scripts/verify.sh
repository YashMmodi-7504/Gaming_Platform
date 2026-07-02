#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# CI-equivalent verification: generate client, typecheck, lint, build.
# -----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm build

echo "✅ Foundation verified."
