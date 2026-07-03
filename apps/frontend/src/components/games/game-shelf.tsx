'use client';

import { Rail } from '@gaming-platform/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { GameSummary } from '@gaming-platform/types';

import { GameCard } from './game-card';
import { GameCardSkeleton } from './game-card-skeleton';

interface GameShelfProps {
  title: string;
  icon?: ReactNode;
  games: GameSummary[] | undefined;
  loading?: boolean;
  viewAllHref?: string;
  /** Route prefix for each card's detail link (e.g. `/casino`). */
  hrefBase?: string;
}

/** Horizontally-scrolling row of game cards. */
export function GameShelf({ title, icon, games, loading, viewAllHref, hrefBase }: GameShelfProps) {
  if (!loading && (!games || games.length === 0)) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight md:text-2xl">
          {icon}
          {title}
        </h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            View all →
          </Link>
        ) : null}
      </div>
      <Rail label={title} trackClassName="-mx-1 px-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0 snap-start sm:w-44">
                <GameCardSkeleton />
              </div>
            ))
          : games?.map((game) => (
              <div key={game.id} className="w-40 shrink-0 snap-start sm:w-44">
                <GameCard game={game} hrefBase={hrefBase} />
              </div>
            ))}
      </Rail>
    </section>
  );
}
