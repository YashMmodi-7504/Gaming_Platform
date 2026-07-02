'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';

import { careerIcon } from '@/components/career/career-icon';
import type { PersonalRecord } from '@/lib/career';

/** Reusable personal-record card (highest multiplier, biggest win, …). */
export function RecordCard({ record, index = 0 }: { record: PersonalRecord; index?: number }) {
  const Icon = careerIcon(record.icon);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -3 }}
      className="card-premium flex items-center gap-3 p-4"
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] ring-1 ring-inset ring-black/5', record.tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{record.label}</p>
        <p className={cn('font-mono text-lg font-bold tabular-nums', record.tone)}>{record.value}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {record.game} · {record.ago}
        </p>
      </div>
    </motion.div>
  );
}
