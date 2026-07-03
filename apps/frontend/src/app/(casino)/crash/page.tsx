'use client';

import { Badge, Button, Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Flame, Play, Trophy, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';

import { GameLivePanel } from '@/components/games/live/game-live-panel';
import { CrashGame } from '@/components/games/prototype/crash-game';
import { CrashStage } from '@/components/games/stage/crash-stage';
import { GameHudStrip } from '@/components/games/stage/game-hud-strip';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { crashApi } from '@/lib/crash-api';

// Presentation-only mock data so the lobby never looks empty.
const RECENT_MULTIPLIERS = [1.18, 2.41, 5.92, 1.04, 12.7, 3.33, 1.87, 24.6, 1.52, 8.09, 1.31, 49.2];
const TOP_WINNERS = [
  { name: 'NovaStrike', mult: 84.21, payout: 21052 },
  { name: 'CryptoFox', mult: 49.18, payout: 12295 },
  { name: 'LunaBet', mult: 32.74, payout: 8185 },
  { name: 'PixelKing', mult: 18.5, payout: 4625 },
];

function chipClass(m: number) {
  if (m < 2) return 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25';
  if (m < 10) return 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/25';
  return 'bg-emerald/12 text-emerald ring-1 ring-inset ring-emerald/25';
}

export default function CrashLobbyPage() {
  const variants = useQuery({ queryKey: ['crash-variants'], queryFn: crashApi.variants });

  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-primary/5 via-white to-accent/5">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 glass px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> Crash
        </span>
        <Badge variant="live" className="gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
        </Badge>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Featured banner */}
        <div className="card-premium sheen relative mb-8 overflow-hidden p-6 sm:p-8">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Badge variant="featured" className="mb-3 gap-1">
                <Flame className="h-3.5 w-3.5" /> Featured
              </Badge>
              <h1 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Ride the <span className="text-gradient">multiplier</span> — cash out before it crashes.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Provably-fair crash points generated from rule definitions. Pick your volatility and fly.
              </p>
              <div className="mt-5 flex flex-wrap gap-6">
                <div>
                  <div className="font-display text-2xl font-bold text-foreground">
                    <AnimatedNumber value={2841} live suffix="" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Players online
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-emerald tabular-nums">84.21×</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5" /> Top cashout today
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-foreground">
                    <AnimatedNumber value={1284910} live prefix="$" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" /> Wagered (24h)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Playable demo game + live panel */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Zap className="h-5 w-5 text-primary" /> Play instantly · Demo
              </h2>
              <Badge variant="new">Free coins</Badge>
            </div>
            <GameHudStrip seed="crash" />
            <CrashStage>
              <CrashGame />
            </CrashStage>
          </section>
          <aside className="space-y-4 lg:col-span-1">
            <GameLivePanel seed="crash" />
          </aside>
        </div>

        {/* Recent multipliers */}
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Recent rounds</h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {RECENT_MULTIPLIERS.map((m, i) => (
              <span
                key={i}
                className={`flex h-8 shrink-0 items-center justify-center rounded-full px-3 font-mono text-xs font-bold tabular-nums ${chipClass(m)}`}
              >
                {m.toFixed(2)}×
              </span>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Variant cards */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Crash Tables</h2>
              <span className="text-xs text-muted-foreground">Choose your volatility</span>
            </div>

            {variants.isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner size={28} />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {variants.data
                  ?.filter((v) => v.enabled)
                  .map((v) => (
                    <Link
                      key={v.key}
                      href={`/crash/${v.key}`}
                      className="card-premium group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-pink/15 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </span>
                        {v.builtIn ? (
                          <Badge variant="neon">Built-in</Badge>
                        ) : (
                          <Badge variant="gold">Custom</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{v.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        up to{' '}
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {v.maxMultiplier.toLocaleString('en-US')}×
                        </span>{' '}
                        · edge {(v.houseEdge * 100).toFixed(1)}% · vol {v.volatility.toFixed(1)}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity group-hover:opacity-100 sm:opacity-0">
                        <Play className="h-4 w-4" /> Play now
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </div>

          {/* Top winners */}
          <aside className="space-y-4">
            <div className="card-premium p-5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-semibold text-foreground">Top winners</h2>
              </div>
              <ul className="space-y-2">
                {TOP_WINNERS.map((w, i) => (
                  <li key={w.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">{w.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-xs font-bold text-emerald tabular-nums">
                        {w.mult.toFixed(2)}×
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">
                        ${w.payout.toLocaleString('en-US')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
