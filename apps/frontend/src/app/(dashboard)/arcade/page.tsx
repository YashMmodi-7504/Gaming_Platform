'use client';

import { Badge, Button, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { CircleDot, Cpu, Dice5, Gamepad2, Play, Rocket, Users } from 'lucide-react';
import Link from 'next/link';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { PROTOTYPE_GAMES, playersOnline } from '@/lib/prototype-games';
import { runtimeApi } from '@/lib/runtime-api';

const CASINO_GAMES = [
  { slug: 'crash', title: 'Crash', href: '/crash', icon: Rocket, gradient: 'from-pink to-violet' },
  { slug: 'dice', title: 'Dice', href: '/dice', icon: Dice5, gradient: 'from-primary to-accent' },
  { slug: 'roulette', title: 'Roulette', href: '/roulette', icon: CircleDot, gradient: 'from-destructive to-warning' },
];

function GameTile({ href, title, tagline, gradient, players }: { href: string; title: string; tagline?: string; gradient: string; players: number }) {
  return (
    <Link href={href} className="group">
      <div className="card-premium sheen overflow-hidden p-0">
        <div className={cn('relative flex h-24 items-center justify-center bg-gradient-to-br', gradient)}>
          <div className="bg-grid absolute inset-0 opacity-30" />
          <Gamepad2 className="h-10 w-10 text-white/90 drop-shadow transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            <Users className="h-3 w-3" /> <AnimatedNumber value={players} />
          </span>
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold transition-colors group-hover:text-primary">{title}</p>
            {tagline ? <p className="truncate text-xs text-muted-foreground">{tagline}</p> : null}
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Play className="h-4 w-4 fill-primary" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ArcadePage() {
  const plugins = useQuery({ queryKey: ['runtime-plugins'], queryFn: runtimeApi.plugins });
  const cards = PROTOTYPE_GAMES.filter((g) => g.category === 'Card');
  const arcade = PROTOTYPE_GAMES.filter((g) => g.category === 'Arcade');

  return (
    <div className="space-y-8">
      {/* Playable prototypes catalog */}
      <section className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient">Games</span> — play instantly
          </h1>
          <p className="text-muted-foreground">Every game is fully playable in demo mode with free coins.</p>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Casino</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CASINO_GAMES.map((g) => (
              <GameTile key={g.slug} href={g.href} title={g.title} gradient={g.gradient} players={playersOnline(g.slug)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Card Games</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((g) => (
              <GameTile key={g.slug} href={`/arcade/${g.slug}`} title={g.title} tagline={g.tagline} gradient={g.gradient} players={playersOnline(g.slug)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Arcade</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {arcade.map((g) => (
              <GameTile key={g.slug} href={`/arcade/${g.slug}`} title={g.title} tagline={g.tagline} gradient={g.gradient} players={playersOnline(g.slug)} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-black/10 p-8 sm:p-10">
        <div className="bg-aurora absolute inset-0 opacity-60" />
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs uppercase tracking-widest text-accent backdrop-blur">
            <Cpu className="h-3.5 w-3.5" /> Runtime Engines
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient">Engine Arcade</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Every registered runtime engine. Each is a data-driven plugin on the shared runtime.
          </p>
        </div>
      </section>

      {plugins.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.data?.map((plugin) => (
          <div
            key={plugin.key}
            className="card-premium sheen flex flex-col p-5 transition-all hover:-translate-y-0.5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
                <Cpu className="h-6 w-6" />
              </span>
              <Badge variant="neon">{plugin.genre}</Badge>
            </div>
            <h3 className="font-display text-lg font-bold">{plugin.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">v{plugin.version}</span>
              <span className="text-white/20">·</span>
              <Users className="h-3 w-3 text-accent" />
              <span className="font-mono tabular-nums">
                {plugin.minPlayers}–{plugin.maxPlayers}
              </span>{' '}
              players
            </p>

            <div className="mb-4 mt-4 flex flex-wrap gap-1">
              {plugin.capabilities.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>

            <Button asChild variant="gradient" className="sheen mt-auto w-full">
              <Link href={`/play/${plugin.key}`}>
                <Play className="h-4 w-4 fill-current" /> Launch runtime
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
