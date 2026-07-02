'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { type Jackpot, jackpots } from '@/lib/casino-demo';

/** Premium 4-tier live jackpot strip with animated gold counters. */
export function JackpotStrip() {
  const tiers = jackpots();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiers.map((j, i) => (
        <JackpotCard key={j.tier} jackpot={j} index={i} mega={j.tier === 'Mega'} />
      ))}
    </div>
  );
}

function JackpotCard({ jackpot, index, mega }: { jackpot: Jackpot; index: number; mega: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -3 }}
      className={cn(
        'card-premium relative overflow-hidden p-4',
        mega && 'ring-1 ring-gold/50 shadow-glow-gold',
      )}
    >
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl', jackpot.tone, mega && 'animate-glow-pulse')} />
      <div className="relative flex items-center gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-glow-sm', jackpot.tone)}>
          <Crown className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {jackpot.tier} Jackpot
        </span>
      </div>
      <p className="relative mt-2 font-mono text-2xl font-extrabold tabular-nums text-gradient-gold">
        <AnimatedNumber value={jackpot.value} prefix="$" live />
      </p>
      <p className="relative mt-1 truncate text-[11px] text-muted-foreground">
        Last: <span className="text-base leading-none">{jackpot.winner.country}</span>{' '}
        <span className="font-semibold text-foreground">{jackpot.winner.name}</span> · {jackpot.winner.ago}
      </p>
    </motion.div>
  );
}
