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

/**
 * Row of game cards. Desktop/tablet keep the horizontal rail (unchanged); on
 * mobile (< md) it becomes a 2-column vertical grid so nothing scrolls sideways
 * and cards fill the available width (Phase 1.5).
 */
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
      {/* Mobile (< md): 2-column grid — no sideways scroll, cards fill width. */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <GameCardSkeleton key={i} />)
          : games?.map((game) => <GameCard key={game.id} game={game} hrefBase={hrefBase} />)}
      </div>

      {/* Desktop/tablet: horizontal rail (unchanged). The hidden rail's lazy
          images never load on mobile, so there is no duplicate image fetch. */}
      <div className="hidden md:block">
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
      </div>
    </section>
  );
}
