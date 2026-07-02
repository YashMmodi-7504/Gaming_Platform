'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { Coins, Flame, Layers, ShoppingBag, TrendingUp, Users } from 'lucide-react';

import { RarityBadge } from '@/components/economy/rarity-badge';
import { WalletInsight } from '@/components/economy/wallet-insight';
import { type Cosmetic } from '@/lib/cosmetics';
import { economyStats } from '@/lib/economy';

function Spotlight({ label, cosmetic, tag }: { label: string; cosmetic: Cosmetic; tag: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', cosmetic.gradient)}>
        <Layers className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold">{cosmetic.name}</p>
          <RarityBadge rarity={cosmetic.rarity} />
        </div>
      </div>
      <Badge variant="neon" className="shrink-0">{tag}</Badge>
    </div>
  );
}

/**
 * Reusable platform economy dashboard: deterministic, backend-free. Reuses the
 * WalletInsight tile and the shared economy engine.
 */
export function EconomyDashboard({ seed = 'economy' }: { seed?: string }) {
  const s = economyStats(seed);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WalletInsight icon={<Coins className="h-5 w-5" />} label="Coins earned today" value={s.coinsEarnedToday} tone="text-gold" index={0} />
        <WalletInsight icon={<ShoppingBag className="h-5 w-5" />} label="Coins spent" value={s.coinsSpent} tone="text-pink" index={1} />
        <WalletInsight icon={<TrendingUp className="h-5 w-5" />} label="Avg purchase" value={s.avgPurchase} tone="text-accent" index={2} />
        <WalletInsight icon={<Users className="h-5 w-5" />} label="Community demand" value={s.communityDemand} suffix="%" tone="text-emerald" index={3} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Spotlight label="Most popular cosmetic" cosmetic={s.mostPopular} tag="Popular" />
        <Spotlight label="Most equipped cosmetic" cosmetic={s.mostEquipped} tag="Equipped" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 font-semibold text-violet">
          <Flame className="h-3.5 w-3.5" /> Trending: {s.trendingBundle}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 font-semibold text-accent">
          <Layers className="h-3.5 w-3.5" /> Hot category: {s.mostActiveCategory}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 font-semibold text-gold">
          Season economy {s.seasonEconomy}%
        </span>
      </div>
    </div>
  );
}
