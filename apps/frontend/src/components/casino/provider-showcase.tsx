'use client';

import { Rail, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Gamepad2, Star } from 'lucide-react';
import Link from 'next/link';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { type Provider, providers } from '@/lib/casino-demo';

/** Premium provider showcase (deterministic demo). */
export function ProviderShowcase() {
  const list = providers();
  return (
    <Rail label="Game providers">
      {list.map((p, i) => (
        <div key={p.code} className="w-52 shrink-0 snap-start">
          <ProviderCard provider={p} index={i} />
        </div>
      ))}
    </Rail>
  );
}

function ProviderCard({ provider, index }: { provider: Provider; index: number }) {
  const initials = provider.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href="/games" className="card-premium sheen group flex flex-col gap-3 p-4">
        <div className={cn('relative flex h-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br', provider.gradient)}>
          <div className="bg-grid absolute inset-0 opacity-20" />
          <span className="font-display text-3xl font-black text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
            {initials}
          </span>
        </div>
        <div>
          <p className="truncate font-display text-sm font-bold">{provider.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Gamepad2 className="h-3 w-3" />
            <AnimatedNumber value={provider.games} className="font-mono tabular-nums" /> games
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-black/5 pt-2 text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-gold">
            <Star className="h-3 w-3 fill-gold" /> {provider.popularity}%
          </span>
          <span className="truncate text-muted-foreground">{provider.featured}</span>
        </div>
      </Link>
    </motion.div>
  );
}
