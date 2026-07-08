'use client';

import dynamic from 'next/dynamic';

/**
 * Progressive gaming shelves (Objective 8). The game-discovery block is the
 * heaviest widget on the dashboard (carousel + several react-query shelves), so
 * it is lazy-loaded (`ssr: false`) behind a skeleton. The lightweight shell —
 * hero, quick actions, wallet summary, activity, achievements — paints first and
 * this chunk streams in after, without blocking first paint. Components are
 * reused unchanged (no card redesign).
 */

function ShelfSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      {[0, 1].map((row) => (
        <div key={row} className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-black/[0.06]" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3, 4].map((c) => (
              <div key={c} className="h-40 w-60 shrink-0 animate-pulse rounded-2xl bg-black/[0.05]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const HomeSections = dynamic(
  () => import('@/components/games/home-sections').then((m) => m.HomeSections),
  { ssr: false, loading: () => <ShelfSkeleton /> },
);

const SportsHighlights = dynamic(
  () => import('@/components/marketing/lobby-sections').then((m) => m.SportsHighlights),
  { ssr: false, loading: () => null },
);

export function GamingShelves() {
  return (
    <div className="space-y-10">
      <HomeSections />
      <SportsHighlights />
    </div>
  );
}
