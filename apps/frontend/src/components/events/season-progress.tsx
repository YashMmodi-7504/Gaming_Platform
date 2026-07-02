'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Check, Crown, Lock, Sparkles, Trophy, Users } from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { SEASON } from '@/lib/ecosystem-data';
import { seasonMilestones, seasonStats } from '@/lib/events';

/** Reusable season progress: story, overall completion, milestones and stats. */
export function SeasonProgress() {
  const milestones = seasonMilestones();
  const stats = seasonStats();
  const pct = Math.round((SEASON.currentTier / SEASON.tiers) * 100);

  return (
    <section className="card-premium space-y-5 overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet text-white shadow-glow">
            <Crown className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-gradient">{SEASON.name}</h2>
            <p className="text-xs text-muted-foreground">
              Tier {SEASON.currentTier} / {SEASON.tiers} · {SEASON.endInDays} days left
            </p>
          </div>
        </div>
        <span className="font-display text-2xl font-extrabold tabular-nums text-gradient">{pct}%</span>
      </div>

      {/* overall completion */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-violet" /> Global season completion
          </span>
          <span className="font-mono tabular-nums text-gradient">{stats.globalCompletion}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-pink shadow-glow-sm"
          />
        </div>
      </div>

      {/* milestones */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Season milestones</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {milestones.map((m) => (
            <div
              key={m.tier}
              className={cn(
                'rounded-xl border p-2.5 text-center',
                m.unlocked ? 'border-gold/40 bg-gold/[0.06]' : 'border-black/5 bg-black/[0.02] opacity-70',
              )}
            >
              <span
                className={cn(
                  'mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full',
                  m.unlocked ? 'bg-gradient-to-br from-gold to-warning text-white shadow-glow-gold' : 'bg-black/5 text-muted-foreground',
                )}
              >
                {m.unlocked ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              </span>
              <p className="truncate text-[11px] font-bold">{m.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">{m.reward}</p>
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-accent">Tier {m.tier}</p>
            </div>
          ))}
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Users className="h-4 w-4" />} label="Players active" value={stats.playersActive} tone="text-emerald" />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Rewards claimed" value={stats.rewardsClaimed} tone="text-gold" />
        <Stat icon={<Crown className="h-4 w-4" />} label="Milestones hit" value={stats.milestonesHit} tone="text-violet" />
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="glass flex items-center gap-2.5 rounded-xl px-3 py-2.5">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]', tone)}>{icon}</span>
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('font-mono text-sm font-bold tabular-nums', tone)}>
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  );
}
