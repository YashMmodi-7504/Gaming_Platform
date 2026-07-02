'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import type { CommunityGoal as CommunityGoalData } from '@/lib/events';

/** Reusable community-goal progress card (global milestone). */
export function CommunityGoal({ goal }: { goal: CommunityGoalData }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  return (
    <div className="card-premium space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">{goal.label}</p>
          <p className="truncate text-xs text-muted-foreground">{goal.detail}</p>
        </div>
        <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-gradient">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r shadow-glow-sm', goal.tone)}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">
          <AnimatedNumber value={goal.current} /> / {goal.target.toLocaleString('en-US')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> <span className="tabular-nums">{goal.contributors.toLocaleString('en-US')}</span> contributors
        </span>
      </div>
    </div>
  );
}
