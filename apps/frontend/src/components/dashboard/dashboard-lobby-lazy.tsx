'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy loader for the rich Dashboard lobby (Phase 1.3.4, preserving the Phase 1.4
 * progressive-render win). The lobby is the heaviest part of the page — game
 * shelves, providers, live feeds and several animated marketing sections — so it
 * is code-split (`ssr: false`) behind a skeleton. The lightweight shell (hero,
 * wallet summary, quick actions) paints first and this chunk streams in after,
 * without blocking first paint. All lobby components are reused unchanged.
 */

function LobbySkeleton() {
  return (
    <div className="space-y-12" aria-hidden>
      {[0, 1, 2].map((row) => (
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

const DashboardLobby = dynamic(
  () => import('@/components/dashboard/dashboard-lobby').then((m) => m.DashboardLobby),
  { ssr: false, loading: () => <LobbySkeleton /> },
);

export function DashboardLobbyLazy() {
  return <DashboardLobby />;
}
