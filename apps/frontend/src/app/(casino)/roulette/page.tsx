'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, CircleDot, Gauge, Play, Timer, Users, Zap } from 'lucide-react';
import Link from 'next/link';

import { RouletteGame } from '@/components/games/prototype/roulette-game';
import { BetGate } from '@/components/wallet/bet-gate';
import { rouletteApi } from '@/lib/roulette-api';

/* ---- Deterministic demo roulette tables (backend-free) ------------------- */

interface TableDef {
  key: string;
  name: string;
  blurb: string;
  speed: 'Standard' | 'Fast' | 'Turbo';
  gradient: string;
  vip?: boolean;
}

const DEMO_TABLES: TableDef[] = [
  { key: 'european', name: 'European Roulette', blurb: 'Single zero · classic', speed: 'Standard', gradient: 'from-emerald to-accent' },
  { key: 'american', name: 'American Roulette', blurb: 'Double zero · Vegas', speed: 'Standard', gradient: 'from-destructive to-warning' },
  { key: 'vip', name: 'VIP Roulette', blurb: 'High limits · private', speed: 'Standard', gradient: 'from-gold via-warning to-pink', vip: true },
  { key: 'lightning', name: 'Lightning Roulette', blurb: 'Multiplier strikes up to 500×', speed: 'Standard', gradient: 'from-primary via-violet to-pink' },
  { key: 'speed', name: 'Speed Roulette', blurb: '25s spins · non-stop action', speed: 'Fast', gradient: 'from-accent to-primary' },
  { key: 'mega', name: 'Mega Roulette', blurb: 'Giant wheel · boosted payouts', speed: 'Standard', gradient: 'from-pink to-violet' },
  { key: 'auto', name: 'Auto Roulette', blurb: 'No dealer · continuous', speed: 'Fast', gradient: 'from-primary to-emerald' },
  { key: 'turbo', name: 'Turbo Roulette', blurb: '10s spins · adrenaline', speed: 'Turbo', gradient: 'from-warning to-destructive' },
  { key: 'live', name: 'Live Roulette', blurb: 'Real dealer · HD stream', speed: 'Standard', gradient: 'from-violet to-primary' },
  { key: 'mini', name: 'Mini Roulette', blurb: '12 pockets · quick rounds', speed: 'Fast', gradient: 'from-emerald to-gold' },
];

const DEALERS = ['Sofia', 'Elena', 'Marco', 'Aria', 'Nadia', 'Leo', 'Mia', 'Victor', 'Luna', 'Diego'];
const AVATAR_TONES = ['from-primary to-violet', 'from-accent to-primary', 'from-gold to-warning', 'from-emerald to-accent', 'from-pink to-violet'];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface TableStats {
  dealer: string;
  tone: string;
  players: number;
  min: number;
  max: number;
  live: boolean;
}

function statsFor(t: TableDef): TableStats {
  const h = hash(t.key);
  return {
    dealer: DEALERS[h % DEALERS.length]!,
    tone: AVATAR_TONES[(h >> 3) % AVATAR_TONES.length]!,
    players: 40 + (h % 320),
    min: t.vip ? 100 : 1 + (h % 5),
    max: t.vip ? 100_000 : 5000 + (h % 10) * 1000,
    live: h % 3 !== 0,
  };
}

export default function RouletteLobbyPage() {
  const variants = useQuery({ queryKey: ['roulette-variants'], queryFn: rouletteApi.variants });
  const enabled = variants.data?.filter((v) => v.enabled) ?? [];

  return (
    <div className="h-full overflow-auto">
      <header className="glass-strong sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/40 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <span className="font-display flex items-center gap-2 font-semibold text-foreground">
          <CircleDot className="h-5 w-5 text-primary" /> Roulette
        </span>
        <div className="w-24" />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 max-md:hidden">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">Roulette Tables</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Every wheel is generated from rule definitions with provably-fair spins.
          </p>
        </div>

        {/* Playable demo game */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-foreground">
              <Zap className="h-5 w-5 text-primary" /> Play instantly · Demo
            </h2>
            <Badge variant="new">Free coins</Badge>
          </div>
          <BetGate>
            <RouletteGame />
          </BetGate>
        </section>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-foreground">
            <CircleDot className="h-5 w-5 text-primary" /> Live Tables
          </h2>
          <Badge variant="live">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {(enabled.length > 0 ? enabled.length : DEMO_TABLES.length)} tables open
          </Badge>
        </div>

        {enabled.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enabled.map((v) => (
              <Link
                key={v.key}
                href={`/roulette/${v.key}`}
                className="card-premium sheen group flex flex-col p-5 transition-transform hover:-translate-y-1"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald to-accent text-white shadow-glow">
                    <CircleDot className="h-5 w-5" />
                  </span>
                  {v.builtIn ? null : <Badge variant="secondary">Custom</Badge>}
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">{v.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {v.pockets} pockets · {v.zeroCount === 2 ? 'double zero' : 'single zero'}
                  {v.houseRules.laPartage ? ' · la partage' : ''}
                  {v.houseRules.enPrison ? ' · en prison' : ''}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-4 w-4" /> Play now
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_TABLES.map((t) => (
              <RouletteTableCard key={t.key} table={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RouletteTableCard({ table }: { table: TableDef }) {
  const s = statsFor(table);
  return (
    <Link
      href="/roulette"
      className={cn(
        'card-premium group relative flex flex-col overflow-hidden p-0 transition-transform hover:-translate-y-1',
        table.vip && 'ring-1 ring-gold/40',
      )}
    >
      {/* Table artwork */}
      <div className={cn('relative h-28 overflow-hidden bg-gradient-to-br', table.gradient)}>
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="absolute -inset-x-8 -top-8 h-20 rotate-12 bg-white/25 blur-2xl transition-opacity duration-500 group-hover:opacity-90" />
        <CircleDot className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow-lg transition-transform duration-500 group-hover:scale-110" />
        {s.live ? (
          <Badge variant="live" className="absolute left-3 top-3">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> Live
          </Badge>
        ) : (
          <Badge variant="new" className="absolute left-3 top-3">Open</Badge>
        )}
        {table.vip ? <Badge variant="gold" className="absolute right-3 top-3">VIP</Badge> : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-foreground">{table.name}</h3>
            <p className="truncate text-[11px] text-muted-foreground">{table.blurb}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-accent">
            <Gauge className="h-3 w-3" /> {table.speed}
          </span>
        </div>

        {/* Dealer + players */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white ring-2 ring-white', s.tone)}>
              {s.dealer.slice(0, 2).toUpperCase()}
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-semibold">{s.dealer}</span>
              <span className="block text-[10px] text-muted-foreground">Dealer</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald">
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums">{s.players}</span>
          </span>
        </div>

        {/* Limits + join */}
        <div className="flex items-center justify-between border-t border-black/5 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">
              {s.min.toLocaleString('en-US')}–{s.max.toLocaleString('en-US')}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-violet px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm transition-transform group-hover:scale-105">
            <Play className="h-3.5 w-3.5 fill-current" /> Join
          </span>
        </div>
      </div>
    </Link>
  );
}
