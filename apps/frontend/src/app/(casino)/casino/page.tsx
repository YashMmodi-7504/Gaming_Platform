'use client';

import { Button, cn } from '@gaming-platform/ui';
import {
  ChevronLeft,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Radio,
  Spade,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { CasinoHero } from '@/components/casino/casino-hero';
import { JackpotStrip } from '@/components/casino/jackpot-strip';
import { ProviderShowcase } from '@/components/casino/provider-showcase';
import { GameShelf } from '@/components/games/game-shelf';
import { CASINO_SECTIONS, demoGamesBySlugs } from '@/lib/demo-games';

/**
 * The Casino lobby (PPP-7): a premium, casino-ONLY lobby. Table games first,
 * slots after. Every card reads from the single demo registry and launches via
 * `/games/[slug]` → `/play/[slug]` — no arcade/puzzle/casual titles here, and no
 * backend dependency.
 */
const SHELVES: { key: string; title: string; icon: LucideIcon; iconClass: string; slugs: readonly string[] }[] = [
  { key: 'popular-tables', title: '🔥 Popular Tables', icon: Flame, iconClass: 'text-destructive', slugs: CASINO_SECTIONS.popularTables },
  { key: 'live-casino', title: '🎲 Live Casino', icon: Radio, iconClass: 'text-primary', slugs: CASINO_SECTIONS.liveCasino },
  { key: 'featured', title: '⭐ Featured', icon: Star, iconClass: 'text-gold', slugs: CASINO_SECTIONS.featured },
  { key: 'slots', title: '🎰 Slots', icon: Sparkles, iconClass: 'text-pink', slugs: CASINO_SECTIONS.slots },
  { key: 'jackpots', title: '💰 Biggest Jackpots', icon: Coins, iconClass: 'text-gold', slugs: CASINO_SECTIONS.jackpots },
];

const DISCOVER: { label: string; href: string }[] = [
  { label: 'Table Games', href: '/games?category=cards' },
  { label: 'Live Dealer', href: '/games?category=live' },
  { label: 'Roulette', href: '/games?category=roulette' },
  { label: 'Slots', href: '/games?category=slots' },
  { label: 'High RTP', href: '/games?sort=rating' },
  { label: 'New Releases', href: '/games?sort=newest' },
  { label: 'Trending', href: '/games?sort=trending' },
  { label: 'Tournaments', href: '/tournaments' },
];

export default function CasinoLobbyPage() {
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

          {/* Casino-only shelves — tables first, slots after. Cards stay inside
              the casino experience: /casino/[slug] (never /games). */}
          {SHELVES.map((s) => (
            <GameShelf
              key={s.key}
              title={s.title}
              icon={<s.icon className={cn('h-5 w-5', s.iconClass)} />}
              games={demoGamesBySlugs([...s.slugs], s.key)}
              hrefBase="/casino"
            />
          ))}

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
