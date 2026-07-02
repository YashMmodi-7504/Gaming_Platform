# -----------------------------------------------------------------------------
# One-shot local setup (Windows / PowerShell).
# -----------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host '▶ Enabling pnpm via corepack…'
corepack enable
corepack prepare pnpm@9.15.0 --activate

Write-Host '▶ Installing dependencies…'
pnpm install

if (-not (Test-Path .env)) {
  Write-Host '▶ Creating .env from .env.example…'
  Copy-Item .env.example .env
}

Write-Host '▶ Starting Postgres and Redis…'
docker compose -f docker/docker-compose.yml up -d postgres redis

Write-Host '▶ Generating the Prisma client…'
pnpm db:generate

Write-Host '✅ Setup complete. Run "pnpm dev" to start the apps.'
