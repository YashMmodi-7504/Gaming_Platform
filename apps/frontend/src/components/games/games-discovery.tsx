'use client';

import { Input, Spinner } from '@gaming-platform/ui';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Gamepad2, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameSortOption } from '@gaming-platform/types';

import { GameCard } from '@/components/games/game-card';
import { GameGridSkeleton } from '@/components/games/game-card-skeleton';
import { demoSearch } from '@/lib/demo-games';
import { gamesApi, type GameListParams } from '@/lib/games-api';

const SORTS: { value: GameSortOption; label: string }[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'A–Z' },
];

const selectClass =
  'h-11 rounded-xl border border-black/10 bg-black/5 px-3 text-sm text-foreground backdrop-blur transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';

export function GamesDiscovery() {
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<GameSortOption>(
    (params.get('sort') as GameSortOption) ?? 'popular',
  );
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [provider, setProvider] = useState(params.get('provider') ?? '');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: gamesApi.categories });
  const providers = useQuery({ queryKey: ['providers'], queryFn: gamesApi.providers });

  const filters: GameListParams = useMemo(
    () => ({ sort, search: debounced || undefined, category: category || undefined, provider: provider || undefined, limit: 24 }),
    [sort, debounced, category, provider],
  );

  const query = useInfiniteQuery({
    queryKey: ['discovery', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => gamesApi.list({ ...filters, page: pageParam }),
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
  });

  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [query]);

  const games = query.data?.pages.flatMap((p) => p.items) ?? [];
  // Demo fallback: when the backend is absent the registry powers search —
  // casino games rank first (Objective 11). Instant, so no endless skeletons.
  const demoResults = useMemo(
    () => demoSearch({ search: debounced, category, provider, sort }),
    [debounced, category, provider, sort],
  );
  const results = games.length > 0 ? games : demoResults;

  return (
    <div className="space-y-6">
      <div className="glass-strong flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          <Input
            placeholder="Search games or providers…"
            className="h-11 border-black/10 bg-black/5 pl-9 backdrop-blur"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">All providers</option>
          {providers.data?.map((p) => (
            <option key={p.id} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value as GameSortOption)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading && results.length === 0 ? (
        <GameGridSkeleton count={18} />
      ) : results.length === 0 ? (
        <div className="card-premium flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent shadow-glow-sm">
            <Gamepad2 className="h-8 w-8" />
          </span>
          <p className="font-display text-lg font-semibold">No games match your filters</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="flex h-12 items-center justify-center">
        {query.isFetchingNextPage ? <Spinner /> : null}
      </div>
    </div>
  );
}
