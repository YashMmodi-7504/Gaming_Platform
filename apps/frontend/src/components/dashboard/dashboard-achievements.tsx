'use client';

import { cn } from '@gaming-platform/ui';
import { Award, CalendarDays, Gem, Target, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useMissions } from '@/stores/missions';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * Compact achievements + progress panel (Objective 6). Reuses the existing
 * missions store and player profile — daily/weekly missions, achievements, VIP
 * and tournament (season) progress — as small progress tiles. No new state.
 */
export function AchievementsPanel() {
  const daily = useMissions((s) => s.daily);
  const weekly = useMissions((s) => s.weekly);
  const achievements = usePlayerProfile((s) => s.achievements);
  const level = usePlayerProfile((s) => s.level);
  const xp = usePlayerProfile((s) => s.xp);
  const xpToNext = usePlayerProfile((s) => s.xpToNext);
  const seasonTier = usePlayerProfile((s) => s.seasonTier);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dailyDone = daily.filter((m) => m.progress >= m.target).length;
  const weeklyDone = weekly.filter((m) => m.progress >= m.target).length;
  const achUnlocked = achievements.filter((a) => a.unlocked).length;
  const xpPct = xpToNext > 0 ? Math.min(100, Math.round((xp / xpToNext) * 100)) : 0;

  const tiles: {
    label: string;
    value: string;
    pct: number;
    href: string;
    icon: LucideIcon;
    tone: string;
    bar: string;
  }[] = [
    {
      label: 'Daily missions',
      value: `${dailyDone}/${daily.length}`,
      pct: daily.length ? (dailyDone / daily.length) * 100 : 0,
      href: '/missions',
      icon: Target,
      tone: 'text-primary',
      bar: 'from-primary to-accent',
    },
    {
      label: 'Weekly progress',
      value: `${weeklyDone}/${weekly.length}`,
      pct: weekly.length ? (weeklyDone / weekly.length) * 100 : 0,
      href: '/missions',
      icon: CalendarDays,
      tone: 'text-accent',
      bar: 'from-accent to-primary',
    },
    {
      label: 'Achievements',
      value: `${achUnlocked}/${achievements.length}`,
      pct: achievements.length ? (achUnlocked / achievements.length) * 100 : 0,
      href: '/trophies',
      icon: Award,
      tone: 'text-gold',
      bar: 'from-gold to-warning',
    },
    {
      label: 'VIP progress',
      value: `Level ${level}`,
      pct: xpPct,
      href: '/vip',
      icon: Gem,
      tone: 'text-violet',
      bar: 'from-violet to-primary',
    },
    {
      label: 'Tournament',
      value: `Tier ${seasonTier}`,
      pct: Math.min(100, (seasonTier / 50) * 100),
      href: '/tournaments',
      icon: Trophy,
      tone: 'text-emerald',
      bar: 'from-emerald to-accent',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight md:text-xl">
          <Trophy className="h-5 w-5 text-gold" /> Achievements &amp; progress
        </h2>
        <Link href="/missions" className="text-sm font-semibold text-primary hover:underline">
          All missions →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-label={t.label}
            className="card-premium group flex flex-col gap-2 p-4 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <t.icon className={cn('h-3.5 w-3.5', t.tone)} /> {t.label}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-foreground">
              {mounted ? t.value : '—'}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-black/5">
              <span
                className={cn('block h-full rounded-full bg-gradient-to-r transition-[width] duration-500', t.bar)}
                style={{ width: `${mounted ? t.pct : 0}%` }}
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
