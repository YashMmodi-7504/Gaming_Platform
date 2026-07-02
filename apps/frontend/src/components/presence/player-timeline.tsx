'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import {
  Award,
  Coins,
  Gamepad2,
  Gift,
  type LucideIcon,
  Package,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { type PresenceTone, type TimelineKind, timelineFor } from '@/lib/player-presence';

const KIND_ICON: Record<TimelineKind, LucideIcon> = {
  win: Coins,
  achievement: Award,
  levelup: TrendingUp,
  purchase: Package,
  equip: Sparkles,
  mission: Target,
  lootbox: Gift,
  played: Gamepad2,
};

const TONE_TEXT: Record<PresenceTone, string> = {
  emerald: 'text-emerald',
  accent: 'text-accent',
  violet: 'text-violet',
  gold: 'text-gold',
  pink: 'text-pink',
  muted: 'text-muted-foreground',
};

const TONE_RING: Record<PresenceTone, string> = {
  emerald: 'ring-emerald/30 bg-emerald/10',
  accent: 'ring-accent/30 bg-accent/10',
  violet: 'ring-violet/30 bg-violet/10',
  gold: 'ring-gold/30 bg-gold/10',
  pink: 'ring-pink/30 bg-pink/10',
  muted: 'ring-black/10 bg-black/5',
};

/**
 * A premium, chronological activity timeline grouped by day. Deterministic
 * (seeded), so it renders identically on server and client. Reusable for any
 * player's identity surface.
 */
export function PlayerTimeline({ seed, count = 12 }: { seed: string; count?: number }) {
  const days = timelineFor(seed, count);

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.dayOffset} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {day.label}
            </span>
            <span className="h-px flex-1 bg-black/5" />
          </div>

          <ol className="relative space-y-3 pl-6">
            {/* vertical rail */}
            <span className="absolute bottom-2 left-[9px] top-2 w-px bg-black/10" aria-hidden />
            {day.events.map((e, i) => {
              const Icon = KIND_ICON[e.kind];
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                  className="relative flex items-start gap-3"
                >
                  <span
                    className={cn(
                      'absolute -left-6 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-background',
                      TONE_RING[e.tone],
                      TONE_TEXT[e.tone],
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">{e.text}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {e.time}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
