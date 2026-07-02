'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';

import { careerIcon } from '@/components/career/career-icon';

/** Reusable milestone card (a single career/season milestone). */
export function MilestoneCard({
  icon,
  label,
  detail,
  tone = 'text-primary',
  when,
  index = 0,
}: {
  icon: string;
  label: string;
  detail: string;
  tone?: string;
  when?: string;
  index?: number;
}) {
  const Icon = careerIcon(icon);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.4) }}
      className="glass flex items-center gap-3 rounded-2xl p-3"
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] shadow-glow-sm', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
      {when ? <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{when}</span> : null}
    </motion.div>
  );
}
