'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';

import { AnimatedNumber } from '@/components/marketing/animated-number';

/**
 * Reusable economy stat tile with an animated counter. Used across the wallet
 * insights row and the economy dashboard.
 */
export function WalletInsight({
  icon,
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  sub,
  tone = 'text-primary',
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sub?: string;
  tone?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -3 }}
      className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5"
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]', tone)}>
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('font-mono text-lg font-bold tabular-nums', tone)}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {sub ? <p className="truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </motion.div>
  );
}
