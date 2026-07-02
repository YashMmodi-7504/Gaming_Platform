'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Medal } from 'lucide-react';

import { ProgressRing } from '@/components/career/progress-ring';
import { achievementOverall, achievementProgress } from '@/lib/career';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * Reusable achievement-progress overview: an overall completion ring plus a
 * per-category breakdown. Anchored to the real unlocked ratio from the profile
 * store; the full gallery lives on /trophies.
 */
export function AchievementProgress() {
  const achievements = usePlayerProfile((s) => s.achievements);
  const overall = achievementOverall(achievements);
  const categories = achievementProgress(achievements);

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <ProgressRing pct={overall.pct} size={120} stroke={10} from="hsl(var(--gold))" via="hsl(var(--warning))" to="hsl(var(--pink))">
          <Medal className="h-5 w-5 text-gold" />
          <span className="mt-0.5 font-display text-xl font-bold tabular-nums">{overall.pct}%</span>
        </ProgressRing>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {overall.unlocked} / {overall.total} unlocked
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.category}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold">{c.category}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {c.unlocked}/{c.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${c.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  c.pct >= 80 ? 'bg-gradient-to-r from-gold to-warning' : c.pct >= 40 ? 'bg-gradient-to-r from-primary to-violet' : 'bg-gradient-to-r from-accent to-primary',
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
