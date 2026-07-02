'use client';

import { cn } from '@gaming-platform/ui';
import { ArrowRight, Coins, Flame, Star, Trophy } from 'lucide-react';
import Link from 'next/link';

import { ProgressRing } from '@/components/career/progress-ring';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { careerExtras } from '@/lib/career';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * Compact career summary for embedding on the profile page. Reads the profile
 * store + deterministic career extras; links to the full /career dashboard.
 */
export function CareerSummary() {
  const level = usePlayerProfile((s) => s.level);
  const x = careerExtras();

  const tiles = [
    { icon: <Trophy className="h-4 w-4" />, label: 'Total wins', value: x.totalWins, tone: 'text-emerald' },
    { icon: <Coins className="h-4 w-4" />, label: 'Biggest win', value: x.biggestWin, tone: 'text-gold' },
    { icon: <Flame className="h-4 w-4" />, label: 'Best streak', value: x.bestStreak, tone: 'text-pink' },
    { icon: <Star className="h-4 w-4" />, label: 'Games played', value: x.totalGamesPlayed, tone: 'text-accent' },
  ];

  return (
    <section className="card-premium flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <ProgressRing pct={x.careerCompletion} size={84}>
          <span className="font-display text-lg font-bold leading-none tabular-nums">{level}</span>
          <span className="text-[8px] uppercase tracking-wide text-muted-foreground">Career</span>
        </ProgressRing>
        <div>
          <h2 className="font-display text-lg font-bold text-gradient">Career progress</h2>
          <p className="text-xs text-muted-foreground">{x.careerCompletion}% complete · rank #{x.currentRank.toLocaleString('en-US')}</p>
          <Link href="/career" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View career <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="glass rounded-xl px-3 py-2">
            <span className={cn('flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground')}>
              <span className={t.tone}>{t.icon}</span> {t.label}
            </span>
            <p className={cn('mt-0.5 font-mono text-base font-bold tabular-nums', t.tone)}>
              <AnimatedNumber value={t.value} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
