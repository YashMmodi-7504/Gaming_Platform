'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CircleDot,
  Club,
  Dice5,
  Flame,
  Gamepad2,
  Gem,
  type LucideIcon,
  Radio,
  Sparkles,
  Spade,
  Star,
  TrendingUp,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import type { GameCategoryNode, GameSummary } from '@gaming-platform/types';

import { GameShelf } from '@/components/games/game-shelf';
import { demoGames, demoGamesByCategory } from '@/lib/demo-games';
import { gamesApi } from '@/lib/games-api';

/** Deterministic category shelves shown when the backend has no categories. */
const DEMO_CATEGORY_SHELVES: { slug: string; title: string; icon: LucideIcon; iconClass: string }[] = [
  { slug: 'slots', title: 'Slots', icon: Gem, iconClass: 'text-pink' },
  { slug: 'live', title: 'Live Dealer', icon: Radio, iconClass: 'text-destructive' },
  { slug: 'crash', title: 'Crash Games', icon: TrendingUp, iconClass: 'text-primary' },
  { slug: 'cards', title: 'Card Games', icon: Spade, iconClass: 'text-violet' },
  { slug: 'roulette', title: 'Roulette', icon: CircleDot, iconClass: 'text-gold' },
  { slug: 'arcade', title: 'Arcade', icon: Gamepad2, iconClass: 'text-accent' },
  { slug: 'instant', title: 'Instant Win', icon: Club, iconClass: 'text-emerald' },
];

/** How many category rows to render at most, to keep the page performant. */
const MAX_CATEGORY_ROWS = 10;
const ROW_LIMIT = 14;

/** Fade a row in as it scrolls into view (once). */
function RevealRow({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A shelf that never renders empty: if its primary query returns 0 games it
 * falls back to the shared `fallback` list (popular/featured) so every row is
 * full of image cards. Prefers real data; falls back only to avoid emptiness.
 */
function FallbackShelf({
  title,
  icon,
  games,
  loading,
  fallback,
  viewAllHref,
}: {
  title: string;
  icon?: ReactNode;
  games: GameSummary[] | undefined;
  loading: boolean;
  fallback: GameSummary[] | undefined;
  viewAllHref?: string;
}) {
  const resolved = games && games.length > 0 ? games : fallback;

  // Only show the skeleton while genuinely loading AND with nothing to render.
  // A deterministic demo fallback means shelves fill immediately (no endless
  // skeletons) and swap to real data if/when the backend responds.
  if (loading && (!resolved || resolved.length === 0)) {
    return <GameShelf title={title} icon={icon} games={undefined} loading viewAllHref={viewAllHref} />;
  }

  return <GameShelf title={title} icon={icon} games={resolved} viewAllHref={viewAllHref} />;
}

/** One category's row, fetching its games lazily via useQuery. */
function CategoryRow({
  category,
  fallback,
  fallbackLoading,
}: {
  category: GameCategoryNode;
  fallback: GameSummary[] | undefined;
  fallbackLoading: boolean;
}) {
  const query = useQuery({
    queryKey: ['library', 'category', category.slug],
    queryFn: () => gamesApi.list({ category: category.slug, limit: ROW_LIMIT, sort: 'popular' }),
    staleTime: 60_000,
  });

  const games = query.data?.items;
  const loading = query.isLoading || fallbackLoading;

  return (
    <RevealRow>
      <FallbackShelf
        title={category.name}
        icon={<Gamepad2 className="h-5 w-5 text-accent" />}
        games={games}
        loading={loading}
        fallback={fallback}
        viewAllHref={`/games?category=${category.slug}`}
      />
    </RevealRow>
  );
}

interface SectionDef {
  key: string;
  title: string;
  icon: LucideIcon;
  iconClass: string;
  queryFn: () => Promise<GameSummary[]>;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'recommended',
    title: 'Recommended for You',
    icon: Sparkles,
    iconClass: 'text-primary',
    queryFn: () => gamesApi.recommended(ROW_LIMIT),
  },
  {
    key: 'popular',
    title: 'Popular Now',
    icon: Star,
    iconClass: 'text-gold',
    queryFn: () => gamesApi.popular(ROW_LIMIT),
  },
  {
    key: 'trending',
    title: 'Trending',
    icon: TrendingUp,
    iconClass: 'text-pink',
    queryFn: () => gamesApi.trending(ROW_LIMIT),
  },
  {
    key: 'recently-added',
    title: 'Recently Added',
    icon: Flame,
    iconClass: 'text-emerald',
    queryFn: () => gamesApi.recentlyAdded(ROW_LIMIT),
  },
];

/** A curated section row (Recommended / Popular / Trending / Recently Added). */
function SectionRow({
  section,
  fallback,
  fallbackLoading,
}: {
  section: SectionDef;
  fallback: GameSummary[] | undefined;
  fallbackLoading: boolean;
}) {
  const query = useQuery({
    queryKey: ['library', 'section', section.key],
    queryFn: section.queryFn,
    staleTime: 60_000,
  });
  const Icon = section.icon;

  return (
    <RevealRow>
      <FallbackShelf
        title={section.title}
        icon={<Icon className={`h-5 w-5 ${section.iconClass}`} />}
        games={query.data}
        loading={query.isLoading || fallbackLoading}
        fallback={fallback}
      />
    </RevealRow>
  );
}

/**
 * The Netflix-style browse experience: curated section rows followed by one
 * horizontal row per real category. Every row falls back to `popular` so the
 * page is always full of image cards.
 */
export function LibraryRows() {
  // Shared fallback pool used by any row that returns 0 games.
  const popular = useQuery({
    queryKey: ['library', 'section', 'popular'],
    queryFn: () => gamesApi.popular(ROW_LIMIT),
    staleTime: 60_000,
  });
  const featured = useQuery({
    queryKey: ['library', 'featured'],
    queryFn: () => gamesApi.featured(ROW_LIMIT),
    staleTime: 60_000,
  });

  // Deterministic demo pool so no shelf is ever empty in demo mode.
  const demo = useMemo(() => demoGames('library', ROW_LIMIT), []);

  const fallback =
    popular.data && popular.data.length > 0
      ? popular.data
      : featured.data && featured.data.length > 0
        ? featured.data
        : demo;
  const fallbackLoading = false;

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: gamesApi.categories,
    staleTime: 300_000,
  });

  const categoryRows = (categories.data ?? [])
    .filter((c) => Boolean(c.slug))
    .slice(0, MAX_CATEGORY_ROWS);
  const hasRealCategories = categoryRows.length > 0;

  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => (
        <SectionRow
          key={section.key}
          section={section}
          fallback={fallback}
          fallbackLoading={fallbackLoading}
        />
      ))}

      <div className="space-y-2">
        <div className="flex items-center gap-2 pt-2">
          <Dice5 className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-muted-foreground">
            Browse by Category
          </h2>
        </div>
        <div className="space-y-10">
          {hasRealCategories
            ? categoryRows.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  fallback={fallback}
                  fallbackLoading={fallbackLoading}
                />
              ))
            : DEMO_CATEGORY_SHELVES.map((c) => (
                <RevealRow key={c.slug}>
                  <GameShelf
                    title={c.title}
                    icon={<c.icon className={`h-5 w-5 ${c.iconClass}`} />}
                    games={demoGamesByCategory(c.slug, ROW_LIMIT)}
                    viewAllHref={`/games?category=${c.slug}`}
                  />
                </RevealRow>
              ))}
        </div>
      </div>
    </div>
  );
}
