'use client';

import { Badge, Spinner, cn } from '@gaming-platform/ui';
import {
  BookOpen,
  ChevronLeft,
  Gamepad2,
  Keyboard,
  type LucideIcon,
  Signal,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type ComponentType, useEffect } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { playersOnline, prototypeBySlug } from '@/lib/prototype-games';
import { useGameStat } from '@/stores/game-stats';

/** Literal dynamic imports keep each game in its own lazy chunk. */
const GAMES: Record<string, ComponentType> = {
  blackjack: dynamic(() => import('@/components/games/prototype/cards/blackjack').then((m) => m.BlackjackGame)),
  baccarat: dynamic(() => import('@/components/games/prototype/cards/baccarat').then((m) => m.BaccaratGame)),
  'dragon-tiger': dynamic(() => import('@/components/games/prototype/cards/dragon-tiger').then((m) => m.DragonTigerGame)),
  'andar-bahar': dynamic(() => import('@/components/games/prototype/cards/andar-bahar').then((m) => m.AndarBaharGame)),
  'lucky-7': dynamic(() => import('@/components/games/prototype/cards/lucky-7').then((m) => m.Lucky7Game)),
  'casino-war': dynamic(() => import('@/components/games/prototype/cards/casino-war').then((m) => m.CasinoWarGame)),
  'teen-patti': dynamic(() => import('@/components/games/prototype/cards/teen-patti').then((m) => m.TeenPattiGame)),
  plinko: dynamic(() => import('@/components/games/prototype/arcade/plinko').then((m) => m.PlinkoGame)),
  '2048': dynamic(() => import('@/components/games/prototype/arcade/2048').then((m) => m.Game2048)),
  memory: dynamic(() => import('@/components/games/prototype/arcade/memory').then((m) => m.MemoryGame)),
  reaction: dynamic(() => import('@/components/games/prototype/arcade/reaction').then((m) => m.ReactionGame)),
  'color-match': dynamic(() => import('@/components/games/prototype/arcade/color-match').then((m) => m.ColorMatchGame)),
};

const DIFF_TONE: Record<string, string> = { Easy: 'text-emerald', Medium: 'text-gold', Hard: 'text-destructive' };

export default function PrototypeGamePage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] ?? '' : '';
  const game = prototypeBySlug(slug);
  const Game = GAMES[slug];
  const stat = useGameStat(slug);

  // No dead ends: an unknown arcade slug routes to the always-valid detail page
  // instead of a 404.
  const missing = !game || !Game;
  useEffect(() => {
    if (missing) router.replace(`/games/${slug}`);
  }, [missing, router, slug]);

  if (missing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const players = playersOnline(slug);
  const related = game.related.map(prototypeBySlug).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card-premium relative overflow-hidden p-6 sm:p-8">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', game.gradient)} />
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={cn('flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow', game.gradient)}>
              <Gamepad2 className="h-8 w-8" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Link href="/arcade" className="text-xs text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="inline h-3 w-3" /> Games
                </Link>
                <Badge variant="new">{game.category}</Badge>
              </div>
              <h1 className="font-display text-3xl font-bold">{game.title}</h1>
              <p className="text-sm text-muted-foreground">{game.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Meta icon={Users} label="Players" value={<AnimatedNumber value={players} live />} />
            <Meta icon={Signal} label="Difficulty" value={<span className={DIFF_TONE[game.difficulty]}>{game.difficulty}</span>} />
            <Meta icon={Star} label="Play time" value={game.playTime} />
            <Meta icon={Trophy} label="Best" value={String(stat.highest)} />
          </div>
        </div>
      </section>

      {/* The playable game */}
      <Game />

      {/* Detail grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={BookOpen} title="How to play" items={game.rules} />
        <InfoCard icon={Keyboard} title="Controls" items={game.controls} />
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">{game.description}</p>

      {/* Related */}
      {related.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold">Related games</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((g) => (
              <Link key={g!.slug} href={`/arcade/${g!.slug}`} className="group">
                <div className="card-premium sheen flex items-center gap-3 p-4">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white', g!.gradient)}>
                    <Gamepad2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold transition-colors group-hover:text-primary">{g!.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{g!.tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div className="card-premium p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display font-bold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
