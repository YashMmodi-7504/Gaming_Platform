'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';

import { eventIcon } from '@/components/events/event-icon';
import type { EventStatus, PlatformEvent } from '@/lib/events';

const STATE: Record<EventStatus, { dot: string; text: string }> = {
  featured: { dot: 'bg-gold text-white ring-gold/30', text: 'text-gold' },
  live: { dot: 'bg-emerald text-white ring-emerald/30 animate-glow-pulse', text: 'text-emerald' },
  upcoming: { dot: 'bg-accent text-white ring-accent/30', text: 'text-accent' },
  finished: { dot: 'bg-black/10 text-muted-foreground ring-black/10', text: 'text-muted-foreground' },
};

/** Reusable event schedule timeline (live → upcoming → finished). */
export function EventTimeline({ events }: { events: PlatformEvent[] }) {
  const order: EventStatus[] = ['featured', 'live', 'upcoming', 'finished'];
  const sorted = [...events].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <ol className="relative space-y-3 pl-7">
      <span className="absolute bottom-3 left-[11px] top-3 w-px bg-black/10" aria-hidden />
      {sorted.map((e, i) => {
        const s = STATE[e.status];
        const Icon = eventIcon(e.icon);
        const timing =
          e.status === 'finished'
            ? `Ended ${e.endedAgo}`
            : e.status === 'upcoming'
              ? `Starts in ${Math.round(e.seconds / 3600)}h`
              : `${Math.round(e.seconds / 60)}m left`;
        return (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.28, delay: Math.min(i * 0.05, 0.4) }}
            className="relative flex items-center gap-3"
          >
            <span className={cn('absolute -left-7 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-background', s.dot)}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className={cn('truncate text-sm font-semibold', s.text)}>{e.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{e.reward}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{timing}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
