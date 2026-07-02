'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Layers, Package, Sparkles } from 'lucide-react';

import { ProgressRing } from '@/components/career/progress-ring';
import { RarityBadge } from '@/components/economy/rarity-badge';
import { collectionSummary } from '@/lib/career';
import { cosmeticById } from '@/lib/cosmetics';
import { usePlayerProfile } from '@/stores/player-profile';

function label(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1) + 's';
}

/**
 * Reusable collection-completion overview computed from the real cosmetic
 * catalog + owned ids: overall completion, per-category bars, rarest & newest.
 */
export function CollectionProgress() {
  const owned = usePlayerProfile((s) => s.owned);
  const summary = collectionSummary(owned);
  const rarest = summary.rarestOwnedId ? cosmeticById(summary.rarestOwnedId) : null;
  const newest = summary.newestOwnedId ? cosmeticById(summary.newestOwnedId) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <ProgressRing pct={summary.pct} size={110} stroke={9} from="hsl(var(--accent))" via="hsl(var(--primary))" to="hsl(var(--pink))">
            <Package className="h-5 w-5 text-accent" />
            <span className="mt-0.5 font-display text-xl font-bold tabular-nums">{summary.pct}%</span>
          </ProgressRing>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {summary.owned} / {summary.total} owned
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {summary.byCategory.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold">{label(c.category)}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {c.owned}/{c.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${c.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-pink"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rarest ? (
          <div className="glass flex items-center gap-3 rounded-2xl p-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', rarest.gradient)}>
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rarest owned</p>
              <div className="flex items-center gap-1.5">
                <p className="truncate font-display text-sm font-bold">{rarest.name}</p>
                <RarityBadge rarity={rarest.rarity} />
              </div>
            </div>
          </div>
        ) : null}
        {newest ? (
          <div className="glass flex items-center gap-3 rounded-2xl p-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-glow-sm', newest.gradient)}>
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Newest unlock</p>
              <div className="flex items-center gap-1.5">
                <p className="truncate font-display text-sm font-bold">{newest.name}</p>
                <RarityBadge rarity={newest.rarity} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
