'use client';

import { Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { useParams } from 'next/navigation';

import { Footer } from '@/components/layout/footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { GameGrid } from '@/components/games/game-grid';
import { GameGridSkeleton } from '@/components/games/game-card-skeleton';
import { demoGames } from '@/lib/demo-games';
import { gamesApi } from '@/lib/games-api';

/** Prettify a slug into a title (e.g. "high-rollers" → "High Rollers"). */
function titleize(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CollectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const query = useQuery({
    queryKey: ['collection', slug],
    queryFn: () => gamesApi.collection(slug),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="container flex-1 space-y-8 py-10">
        {query.isLoading ? (
          <>
            <Spinner size={28} />
            <GameGridSkeleton />
          </>
        ) : query.data ? (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-black/10 p-8 sm:p-10">
              <div className="bg-aurora absolute inset-0 opacity-60" />
              <div className="bg-grid absolute inset-0 opacity-30" />
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs uppercase tracking-widest text-accent backdrop-blur">
                  <Layers className="h-3.5 w-3.5" /> Collection
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  <span className="text-gradient">{query.data.collection.name}</span>
                </h1>
                {query.data.collection.description ? (
                  <p className="max-w-2xl text-muted-foreground">
                    {query.data.collection.description}
                  </p>
                ) : null}
              </div>
            </section>
            <GameGrid games={query.data.games.items} />
          </>
        ) : (
          // Demo-safe: never a dead end — synthesize a playable collection.
          <>
            <section className="relative overflow-hidden rounded-3xl border border-black/10 p-8 sm:p-10">
              <div className="bg-aurora absolute inset-0 opacity-60" />
              <div className="bg-grid absolute inset-0 opacity-30" />
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs uppercase tracking-widest text-accent backdrop-blur">
                  <Layers className="h-3.5 w-3.5" /> Collection
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  <span className="text-gradient">{titleize(slug)}</span>
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  A hand-picked {titleize(slug)} collection — play any title instantly in demo mode.
                </p>
              </div>
            </section>
            <GameGrid games={demoGames(`col-${slug}`, 12)} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
