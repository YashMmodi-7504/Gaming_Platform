'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Check, Circle, Loader2 } from 'lucide-react';

import { type PhaseState, tournamentPhases } from '@/lib/competition';

const STATE_STYLE: Record<PhaseState, { dot: string; text: string; icon: typeof Check }> = {
  done: { dot: 'bg-emerald text-white ring-emerald/30', text: 'text-foreground', icon: Check },
  current: { dot: 'bg-accent text-white ring-accent/40 animate-glow-pulse', text: 'text-accent', icon: Loader2 },
  upcoming: { dot: 'bg-black/5 text-muted-foreground ring-black/10', text: 'text-muted-foreground', icon: Circle },
};

/**
 * Reusable competition phase timeline: registration → bracket → rounds → final
 * → champion → prizes, each resolved to done / current / upcoming from status.
 * Deterministic and animated.
 */
export function TournamentTimeline({ status, rounds = 4 }: { status: string; rounds?: number }) {
  const phases = tournamentPhases(status, rounds);

  return (
    <ol className="relative space-y-4 pl-7">
      <span className="absolute bottom-3 left-[11px] top-3 w-px bg-black/10" aria-hidden />
      {phases.map((phase, i) => {
        const s = STATE_STYLE[phase.state];
        const Icon = s.icon;
        return (
          <motion.li
            key={phase.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.5) }}
            className="relative flex items-start gap-3"
          >
            <span
              className={cn(
                'absolute -left-7 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-background',
                s.dot,
              )}
            >
              <Icon className={cn('h-3 w-3', phase.state === 'current' && 'animate-spin-slow')} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className={cn('text-sm font-semibold', s.text)}>{phase.label}</p>
              <p className="text-[11px] text-muted-foreground">{phase.detail}</p>
            </div>
            {phase.state === 'current' ? (
              <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                Now
              </span>
            ) : null}
          </motion.li>
        );
      })}
    </ol>
  );
}
