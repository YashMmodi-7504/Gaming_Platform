'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';

import { careerIcon } from '@/components/career/career-icon';
import { careerJourney } from '@/lib/career';

function whenLabel(daysAgo: number): string {
  if (daysAgo < 1) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 30) return `${daysAgo}d ago`;
  const months = Math.round(daysAgo / 30);
  return `${months}mo ago`;
}

/**
 * Reusable chronological career journey (first login → recent milestones).
 * Deterministic. `limit` renders a compact preview.
 */
export function JourneyTimeline({ seed = 'career', limit }: { seed?: string; limit?: number }) {
  const all = careerJourney(seed).sort((a, b) => b.daysAgo - a.daysAgo);
  const events = limit ? all.slice(0, limit) : all;

  return (
    <ol className="relative space-y-3.5 pl-7">
      <span className="absolute bottom-3 left-[11px] top-3 w-px bg-black/10" aria-hidden />
      {events.map((e, i) => {
        const Icon = careerIcon(e.icon);
        return (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
            className="relative flex items-center gap-3"
          >
            <span className={cn('absolute -left-7 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/[0.04] ring-2 ring-background', e.tone)}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">{e.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{whenLabel(e.daysAgo)}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
