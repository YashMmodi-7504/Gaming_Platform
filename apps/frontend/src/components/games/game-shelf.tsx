'use client';

import { Rail } from '@gaming-platform/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { GameSummary } from '@gaming-platform/types';

import { useIsMobile } from '@/hooks/use-is-mobile';
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
  const isMobile = useIsMobile();
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
            className="py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent max-md:min-h-[44px]"
          >
            View all →
          </Link>
        ) : null}
      </div>

      {isMobile ? (
        /* Mobile: adaptive grid — auto-fills 2 columns while cards stay ≥ 150px,
           dropping to 1 column on the narrowest phones so cards are never tiny.
           Only this tree mounts on mobile — no hidden desktop rail. */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <GameCardSkeleton key={i} />)
            : games?.map((game) => <GameCard key={game.id} game={game} hrefBase={hrefBase} />)}
        </div>
      ) : (
        /* Desktop/tablet: horizontal rail (unchanged). */
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
      )}
    </section>
  );
}
