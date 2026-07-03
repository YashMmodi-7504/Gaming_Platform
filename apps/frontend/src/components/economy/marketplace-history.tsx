'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Receipt } from 'lucide-react';

import { RarityBadge } from '@/components/economy/rarity-badge';
import { type Trade } from '@/lib/economy';

/** Reusable "latest trades" list for the marketplace. Deterministic. */
export function MarketplaceHistory({ trades }: { trades: Trade[] }) {
  return (
    <ul className="space-y-1.5">
      {trades.map((t, i) => (
        <motion.li
          key={t.id}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.3) }}
          className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/50 px-3 py-2 backdrop-blur transition-colors hover:border-primary/30"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            <Receipt className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{t.item}</p>
              <RarityBadge rarity={t.rarity} />
            </div>
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <span className="truncate">{t.seller}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate text-foreground">{t.buyer}</span>
              <span className="shrink-0">· {t.ago}</span>
            </p>
          </div>
          <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-gold">
            {t.price.toLocaleString('en-US')}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
