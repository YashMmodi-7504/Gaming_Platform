'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Clock, Coins, Flame, Gamepad2, Trophy } from 'lucide-react';

import { ProgressRing } from '@/components/career/progress-ring';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { careerExtras } from '@/lib/career';
import { usePlayerProfile } from '@/stores/player-profile';

function formatPlayTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h}h ${(minutes % 60).toString().padStart(2, '0')}m`;
}

/** Reusable career hero: level, XP, headline lifetime stats and completion. */
export function CareerHero() {
  const p = usePlayerProfile();
  const x = careerExtras();
  const xpPct = Math.min(100, Math.round((p.xp / Math.max(1, p.xpToNext)) * 100));

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="card-premium relative overflow-hidden rounded-3xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-violet/15 to-accent/15" />
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary to-violet opacity-20 blur-3xl animate-glow-pulse" />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <ProgressRing pct={x.careerCompletion} size={104} stroke={9}>
            <span className="font-display text-2xl font-bold leading-none tabular-nums">{p.level}</span>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Career</span>
          </ProgressRing>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Career level</p>
            <h1 className="font-display text-3xl font-extrabold text-gradient sm:text-4xl">Level {p.level}</h1>
            <div className="w-56 max-w-full">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono tabular-nums">{p.xp.toLocaleString('en-US')} XP</span>
                <span className="font-mono tabular-nums">{xpPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-pink shadow-glow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <HeroStat icon={<Coins className="h-4 w-4" />} label="Coins earned" value={x.totalCoinsEarned} tone="text-gold" />
          <HeroStat icon={<Gamepad2 className="h-4 w-4" />} label="Games played" value={x.totalGamesPlayed} tone="text-accent" />
          <HeroStat icon={<Trophy className="h-4 w-4" />} label="Total wins" value={x.totalWins} tone="text-emerald" />
          <HeroStat icon={<Flame className="h-4 w-4" />} label="Best streak" value={x.bestStreak} tone="text-pink" />
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2 px-6 pb-6 text-xs sm:px-8">
        <Chip icon={<Clock className="h-3.5 w-3.5" />} label={`${formatPlayTime(p.playMinutes)} played`} />
        <Chip label={`Favorite: ${p.favoriteGame}`} />
        <Chip label={`${p.joinedDays}d as a member`} />
        <Chip label={`Rank #${x.currentRank.toLocaleString('en-US')} · best #${x.highestRank}`} />
      </div>
    </motion.section>
  );
}

function HeroStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5">
      <span className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground')}>
        <span className={tone}>{icon}</span> {label}
      </span>
      <p className={cn('mt-0.5 font-mono text-lg font-bold tabular-nums', tone)}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function Chip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 font-semibold text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
