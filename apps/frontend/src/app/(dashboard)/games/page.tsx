'use client';

import { Button, Spinner } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, LayoutGrid, Search } from 'lucide-react';
import { Suspense, useState } from 'react';

import { GamesDiscovery } from '@/components/games/games-discovery';
import { LibraryRows } from '@/components/games/library-rows';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { gamesApi } from '@/lib/games-api';

type Tab = 'browse' | 'search';

export default function GamesLibraryPage() {
  const [tab, setTab] = useState<Tab>('browse');

  // Just the count for the hero (limit 1 keeps the payload tiny).
  const total = useQuery({
    queryKey: ['library', 'count'],
    queryFn: () => gamesApi.list({ limit: 1 }),
    staleTime: 300_000,
  });
  const count = total.data?.meta.total ?? 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 p-8 sm:p-10">
        <div className="bg-aurora absolute inset-0 opacity-60" />
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs uppercase tracking-widest text-accent backdrop-blur">
            <Gamepad2 className="h-3.5 w-3.5" /> Game Library
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient">Game Library</span>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            {count > 0 ? (
              <>
                Browse <AnimatedNumber value={count} className="font-semibold text-foreground" />{' '}
                games across every category — hand-picked rows, trending hits, and more.
              </>
            ) : (
              <>Browse the full catalog — hand-picked rows, trending hits, and more.</>
            )}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant={tab === 'browse' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('browse')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" /> Browse
            </Button>
            <Button
              variant={tab === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('search')}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> Search &amp; Filter
            </Button>
          </div>
        </div>
      </section>

      {tab === 'browse' ? (
        <LibraryRows />
      ) : (
        <Suspense fallback={<Spinner size={28} />}>
          <GamesDiscovery />
        </Suspense>
      )}
    </div>
  );
}
