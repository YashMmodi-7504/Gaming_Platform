'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gauge,
  Gift,
  Heart,
  type LucideIcon,
  Play,
  Radio,
  Sparkles,
  Spade,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CasinoHero } from '@/components/casino/casino-hero';
import { JackpotStrip } from '@/components/casino/jackpot-strip';
import { ProviderShowcase } from '@/components/casino/provider-showcase';
import { GameShelf } from '@/components/games/game-shelf';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { cardApi, type CardVariantSummary } from '@/lib/card-api';
import { demoGames, demoGamesByCategory } from '@/lib/demo-games';

const MODE_LABEL: Record<string, string> = {
  'poker-rank': 'Poker ranking',
  'high-card': 'High card',
  'point-total': 'Point total',
  blackjack: 'Blackjack',
  'sum-points': 'Sum of points',
  'side-match': 'Side match',
  'over-under': 'Over / under',
};

/** Bright artwork gradients cycled across table cards (presentation only). */
const ART_GRADIENTS = [
  'from-primary/80 via-accent/60 to-primary/70',
  'from-emerald/80 via-accent/50 to-primary/60',
  'from-pink/70 via-primary/60 to-accent/60',
  'from-gold/70 via-pink/50 to-primary/60',
  'from-accent/80 via-primary/60 to-emerald/60',
  'from-primary/70 via-pink/50 to-gold/60',
];

/** Tiny deterministic hash so mock stats stay stable per table (no RNG in render). */
function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

interface TableStats {
  players: number;
  rtp: number;
  jackpot: number;
  hot: boolean;
  isNew: boolean;
}

function statsFor(v: CardVariantSummary): TableStats {
  const s = seed(v.key);
  return {
    players: 120 + (s % 4200),
    rtp: 96 + ((s >> 3) % 350) / 100,
    jackpot: 5000 + (s % 920) * 137,
    hot: s % 3 === 0,
    isNew: !v.builtIn || s % 5 === 0,
  };
}

/** Premium cover-art collections (reuse GameShelf → GameCard → GameCover). */
const COLLECTIONS: { key: string; title: string; icon: LucideIcon; iconClass: string; games: ReturnType<typeof demoGames> }[] = [
  { key: 'featured', title: 'Featured Games', icon: Star, iconClass: 'text-gold', games: demoGames('cas-featured', 12) },
  { key: 'trending', title: 'Trending Today', icon: Flame, iconClass: 'text-pink', games: demoGames('cas-trending', 12) },
  { key: 'jackpots', title: 'Biggest Jackpots', icon: Coins, iconClass: 'text-gold', games: demoGamesByCategory('slots', 12) },
  { key: 'vip', title: 'VIP Exclusive', icon: Crown, iconClass: 'text-gold', games: demoGames('cas-vip', 12) },
  { key: 'lightning', title: 'Lightning Games', icon: Zap, iconClass: 'text-primary', games: demoGames('cas-lightning', 12) },
  { key: 'most-played', title: 'Most Played', icon: TrendingUp, iconClass: 'text-primary', games: demoGames('cas-most', 12) },
  { key: 'recommended', title: 'Recommended', icon: Sparkles, iconClass: 'text-violet', games: demoGames('cas-rec', 12) },
  { key: 'new', title: 'New Releases', icon: Star, iconClass: 'text-emerald', games: demoGames('cas-new', 12) },
  { key: 'high-rtp', title: 'High RTP', icon: Gauge, iconClass: 'text-emerald', games: demoGames('cas-rtp', 12) },
  { key: 'bonus', title: 'Bonus Games', icon: Gift, iconClass: 'text-pink', games: demoGames('cas-bonus', 12) },
  { key: 'live-dealer', title: 'Live Dealer', icon: Radio, iconClass: 'text-destructive', games: demoGamesByCategory('live', 12) },
];

const LIVE_SECTION = { id: 'live', title: 'Live Dealer Tables', icon: Radio, accent: 'text-destructive' };

const DISCOVER: { label: string; href: string }[] = [
  { label: 'Slots', href: '/games?category=slots' },
  { label: 'Live Dealer', href: '/games?category=live' },
  { label: 'High RTP', href: '/games?sort=rating' },
  { label: 'New Releases', href: '/games?sort=newest' },
  { label: 'Trending', href: '/games?sort=trending' },
  { label: 'Card Games', href: '/games?category=cards' },
  { label: 'Roulette', href: '/roulette' },
  { label: 'Tournaments', href: '/tournaments' },
];

/**
 * Deterministic demo tables so the lobby is never empty when the backend isn't
 * reachable (demo mode). Grounded in real card-game names; keys match the
 * data-driven engine's variants.
 */
const DEMO_TABLES: CardVariantSummary[] = [
  { key: 'teen-patti', name: 'Teen Patti', evaluationMode: 'poker-rank', builtIn: true, enabled: true, sides: [], betCount: 6 },
  { key: 'dragon-tiger', name: 'Dragon Tiger', evaluationMode: 'high-card', builtIn: true, enabled: true, sides: [], betCount: 5 },
  { key: 'andar-bahar', name: 'Andar Bahar', evaluationMode: 'side-match', builtIn: true, enabled: true, sides: [], betCount: 4 },
  { key: 'baccarat', name: 'Baccarat', evaluationMode: 'point-total', builtIn: true, enabled: true, sides: [], betCount: 5 },
  { key: 'blackjack', name: 'Blackjack', evaluationMode: 'blackjack', builtIn: true, enabled: true, sides: [], betCount: 3 },
  { key: 'hi-lo', name: 'Hi-Lo', evaluationMode: 'over-under', builtIn: true, enabled: true, sides: [], betCount: 4 },
  { key: 'three-card-poker', name: 'Three Card Poker', evaluationMode: 'poker-rank', builtIn: true, enabled: true, sides: [], betCount: 6 },
  { key: 'casino-war', name: 'Casino War', evaluationMode: 'high-card', builtIn: true, enabled: true, sides: [], betCount: 3 },
  { key: 'lucky-nine', name: 'Lucky 9', evaluationMode: 'point-total', builtIn: false, enabled: true, sides: [], betCount: 4 },
  { key: 'red-dog', name: 'Red Dog', evaluationMode: 'over-under', builtIn: false, enabled: true, sides: [], betCount: 5 },
  { key: 'thirty-two-cards', name: '32 Cards', evaluationMode: 'sum-points', builtIn: false, enabled: true, sides: [], betCount: 4 },
  { key: 'poker-showdown', name: 'Poker Showdown', evaluationMode: 'poker-rank', builtIn: false, enabled: true, sides: [], betCount: 7 },
];

export default function CasinoLobbyPage() {
  const variants = useQuery({ queryKey: ['card-variants'], queryFn: cardApi.variants });
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (key: string) =>
    setFavorites((f) => ({ ...f, [key]: !f[key] }));

  const enabled = variants.data?.filter((v) => v.enabled) ?? [];
  // Never render an empty lobby: fall back to deterministic demo tables.
  const tables = enabled.length > 0 ? enabled : DEMO_TABLES;

  return (
    <div className="bg-grid h-full overflow-auto bg-gradient-to-b from-gold/[0.06] via-background/70 to-background">
      <header className="glass-strong sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <span className="flex items-center gap-2 font-display font-semibold text-foreground">
          <Spade className="h-5 w-5 text-primary" /> Casino
        </span>
        <div className="w-24" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-10">
          {/* Immersive hero */}
          <CasinoHero />

          {/* Live jackpots */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
              <Crown className="h-5 w-5 text-gold" /> Live Jackpots
            </h2>
            <JackpotStrip />
          </section>

          {/* Premium cover-art collections */}
          {COLLECTIONS.map((c) => (
            <GameShelf
              key={c.key}
              title={c.title}
              icon={<c.icon className={cn('h-5 w-5', c.iconClass)} />}
              games={c.games}
              viewAllHref="/games"
            />
          ))}

          {/* Live dealer tables — data-driven card engines */}
          <LobbySection
            section={LIVE_SECTION}
            variants={tables}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            offset={0}
          />

          {/* Providers */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
              <Gamepad2 className="h-5 w-5 text-accent" /> Top Providers
            </h2>
            <ProviderShowcase />
          </section>

          {/* Discover */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
              <Sparkles className="h-5 w-5 text-violet" /> Discover
            </h2>
            <div className="flex flex-wrap gap-2">
              {DISCOVER.map((d) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="glass rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-glow-sm"
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function LobbySection({
  section,
  variants,
  favorites,
  onToggleFavorite,
  offset,
}: {
  section: { id: string; title: string; icon: typeof Flame; accent: string };
  variants: CardVariantSummary[];
  favorites: Record<string, boolean>;
  onToggleFavorite: (key: string) => void;
  offset: number;
}) {
  const Icon = section.icon;
  // Rotate the list per-section so each labeled row feels distinct (presentation only).
  const ordered: CardVariantSummary[] =
    variants.length > 0
      ? variants.map((_, i) => variants[(i + offset) % variants.length]!)
      : [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
          <Icon className={`h-5 w-5 ${section.accent}`} /> {section.title}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">{ordered.length} tables</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((v, i) => (
          <TableCard
            key={`${section.id}-${v.key}`}
            variant={v}
            art={ART_GRADIENTS[(i + offset) % ART_GRADIENTS.length]!}
            favorite={!!favorites[v.key]}
            onToggleFavorite={() => onToggleFavorite(v.key)}
            vip={section.id === 'vip'}
            liveRow={section.id === 'live'}
          />
        ))}
      </div>
    </section>
  );
}

function TableCard({
  variant,
  art,
  favorite,
  onToggleFavorite,
  vip,
  liveRow,
}: {
  variant: CardVariantSummary;
  art: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  vip?: boolean;
  liveRow?: boolean;
}) {
  const stats = statsFor(variant);
  return (
    <div className="card-premium group relative flex flex-col overflow-hidden rounded-2xl p-0 transition-all hover:-translate-y-1 hover:shadow-glow">
      {/* Bright artwork header */}
      <div className={`relative h-28 bg-gradient-to-br ${art}`}>
        <div className="absolute inset-0 bg-grid opacity-30" />
        <Spade className="absolute -bottom-3 -right-2 h-24 w-24 text-white/15" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {stats.hot ? <Badge variant="hot">Hot</Badge> : null}
          {stats.isNew ? <Badge variant="new">New</Badge> : null}
          {vip ? <Badge variant="gold">VIP</Badge> : null}
          {liveRow ? <Badge variant="live">Live</Badge> : null}
        </div>

        <button
          type="button"
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={onToggleFavorite}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-transform hover:scale-110"
        >
          <Heart
            className={favorite ? 'h-4 w-4 fill-pink text-pink' : 'h-4 w-4 text-muted-foreground'}
          />
        </button>

        {/* Live players chip on the artwork */}
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
          <Users className="h-3.5 w-3.5 text-accent" />
          <AnimatedNumber value={stats.players} live className="font-mono tabular-nums" /> online
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{variant.name}</h3>
            <p className="text-xs text-muted-foreground">
              {MODE_LABEL[variant.evaluationMode] ?? variant.evaluationMode} · {variant.betCount} bets
            </p>
          </div>
          {variant.builtIn ? null : <Badge variant="secondary">Custom</Badge>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald/10 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">RTP</p>
            <AnimatedNumber
              value={stats.rtp}
              decimals={2}
              suffix="%"
              className="font-mono text-sm font-bold tabular-nums text-emerald"
            />
          </div>
          <div className="rounded-xl bg-gold/10 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Jackpot</p>
            <AnimatedNumber
              value={stats.jackpot}
              prefix="$"
              live
              className="font-mono text-sm font-bold tabular-nums text-gold"
            />
          </div>
        </div>

        <Button asChild variant="gradient" size="sm" className="mt-4 w-full">
          <Link href={`/casino/${variant.key}`}>
            <Play className="h-4 w-4" /> Play now
          </Link>
        </Button>
      </div>
    </div>
  );
}
