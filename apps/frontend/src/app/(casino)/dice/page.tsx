'use client';

import { Badge, Button, Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Dice5, Play, Zap } from 'lucide-react';
import Link from 'next/link';

import { DiceStatsPanel } from '@/components/games/live/dice-stats-panel';
import { GameLivePanel } from '@/components/games/live/game-live-panel';
import { DiceGame } from '@/components/games/prototype/dice-game';
import { DiceStage } from '@/components/games/stage/dice-stage';
import { GameHudStrip } from '@/components/games/stage/game-hud-strip';
import { diceApi } from '@/lib/dice-api';

export default function DiceLobbyPage() {
  const variants = useQuery({ queryKey: ['dice-variants'], queryFn: diceApi.variants });

  return (
    <div className="bg-grid h-full overflow-auto bg-gradient-to-b from-primary/5 via-background to-accent/5">
      <header className="glass-strong sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/40 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <span className="font-display flex items-center gap-2 font-semibold text-foreground">
          <Dice5 className="h-5 w-5 text-primary" /> Dice
        </span>
        <div className="w-24" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">Dice Tables</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Every dice game is generated from rule definitions with provably-fair rolls.
          </p>
        </div>

        {/* Playable demo game + live statistics */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Zap className="h-5 w-5 text-primary" /> Play instantly · Demo
              </h2>
              <Badge variant="new">Free coins</Badge>
            </div>
            <GameHudStrip seed="dice" />
            <DiceStage>
              <DiceGame />
            </DiceStage>
          </section>
          <aside className="space-y-4 lg:col-span-1">
            <DiceStatsPanel seed="dice" />
            <GameLivePanel seed="dice" />
          </aside>
        </div>

        {variants.isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {variants.data
              ?.filter((v) => v.enabled)
              .map((v) => (
                <Link
                  key={v.key}
                  href={`/dice/${v.key}`}
                  className="card-premium sheen group flex flex-col p-5 transition-transform hover:-translate-y-1"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                      <Dice5 className="h-5 w-5" />
                    </span>
                    {v.builtIn ? null : <Badge variant="secondary">Custom</Badge>}
                  </div>
                  <h2 className="font-display text-lg font-semibold text-foreground">{v.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {v.diceCount}×d{v.faces} · {v.betCount} bets · totals {v.totalRange.min}-
                    {v.totalRange.max}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-4 w-4" /> Play now
                  </span>
                </Link>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
