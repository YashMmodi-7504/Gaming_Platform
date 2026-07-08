'use client';

import { Badge, cn } from '@gaming-platform/ui';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Dices,
  Gamepad2,
  Gem,
  Gift,
  LifeBuoy,
  Lock,
  Receipt,
  Settings,
  Spade,
  TrendingUp,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useDemoWallet } from '@/stores/demo-wallet';
import { usePlayerProfile } from '@/stores/player-profile';

/**
 * Premium player-home widgets (Phase 1.3.3 → 1.4). These make the Dashboard the
 * player's personal control center — distinct from the Promotions offer center.
 * All client-only + mounted-gated (they read the persisted wallet / in-memory
 * profile), so there is no hydration mismatch. They reuse the existing stores +
 * design system and never touch wallet/auth logic.
 */

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* ------------------------------------------------------------------ hero */

/**
 * Player hero (Objective 3) — greeting, Demo badge, VIP level, XP progress and
 * today's gaming summary. The headline of the personal control center.
 */
export function PlayerHero() {
  const username = usePlayerProfile((s) => s.username);
  const level = usePlayerProfile((s) => s.level);
  const xp = usePlayerProfile((s) => s.xp);
  const xpToNext = usePlayerProfile((s) => s.xpToNext);
  const seasonName = usePlayerProfile((s) => s.seasonName);
  const seasonTier = usePlayerProfile((s) => s.seasonTier);
  const bets = useDemoWallet((s) => s.bets);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = useMemo(() => {
    const t0 = startOfToday();
    let rounds = 0;
    let wins = 0;
    let wagered = 0;
    let net = 0;
    for (const b of bets) {
      if (b.ts < t0) continue;
      rounds += 1;
      if (b.win) wins += 1;
      wagered += b.stake;
      net += b.net;
    }
    return { rounds, wins, wagered, net };
  }, [bets]);

  const pct = mounted && xpToNext > 0 ? Math.min(100, Math.round((xp / xpToNext) * 100)) : 0;

  return (
    <section className="card-premium relative overflow-hidden p-6 sm:p-8">
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Identity + VIP */}
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-primary font-display text-xl font-bold text-white shadow-glow-sm">
            {mounted ? level : '—'}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back{mounted && username ? `, ${username}` : ''}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Gem className="h-3 w-3 text-violet" /> Demo Account
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              VIP Level {mounted ? level : '—'} · {seasonName} · Tier {mounted ? seasonTier : '—'}
            </p>
            <div className="mt-3 w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet via-primary to-violet shadow-glow-sm transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {mounted ? `${xp.toLocaleString('en-US')} / ${xpToNext.toLocaleString('en-US')} XP` : '— XP'}
              </p>
            </div>
          </div>
        </div>

        {/* Today's gaming summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <TodayStat label="Rounds" value={mounted ? String(today.rounds) : '—'} />
          <TodayStat
            label="Wins"
            value={mounted ? `${today.wins}/${today.rounds}` : '—'}
            tone="text-emerald"
          />
          <TodayStat
            label="Wagered"
            value={mounted ? `₹${today.wagered.toLocaleString('en-US')}` : '—'}
          />
          <TodayStat
            label="Net today"
            value={mounted ? `${today.net >= 0 ? '+' : '−'}₹${Math.abs(today.net).toLocaleString('en-US')}` : '—'}
            tone={mounted && today.net < 0 ? 'text-destructive' : 'text-emerald'}
          />
        </div>
      </div>
    </section>
  );
}

function TodayStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white/50 px-4 py-3 text-center backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-mono text-base font-bold tabular-nums text-foreground', tone)}>{value}</p>
    </div>
  );
}

/* --------------------------------------------------------- quick actions */

const ACTIONS: { label: string; href: string; icon: LucideIcon; tone: string }[] = [
  { label: 'Deposit', href: '/deposit', icon: ArrowDownToLine, tone: 'text-emerald' },
  { label: 'Withdraw', href: '/withdraw', icon: ArrowUpFromLine, tone: 'text-destructive' },
  { label: 'Vault', href: '/vault', icon: Lock, tone: 'text-violet' },
  { label: 'Transactions', href: '/transactions', icon: Receipt, tone: 'text-primary' },
  { label: 'Bet History', href: '/bets', icon: Dices, tone: 'text-accent' },
  { label: 'Casino', href: '/casino', icon: Spade, tone: 'text-primary' },
  { label: 'Sportsbook', href: '/sportsbook', icon: TrendingUp, tone: 'text-accent' },
  { label: 'Promotions', href: '/promotions', icon: Gift, tone: 'text-gold' },
  { label: 'Profile', href: '/profile', icon: UserCircle2, tone: 'text-violet' },
  { label: 'Support', href: '/help', icon: LifeBuoy, tone: 'text-emerald' },
  { label: 'Settings', href: '/settings', icon: Settings, tone: 'text-muted-foreground' },
];

/**
 * Premium quick actions (Objective 2) — equal-size cards, premium hover,
 * responsive from 2 → 6 columns. Every href resolves to an existing route.
 */
export function QuickActions() {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight md:text-xl">
        <Gamepad2 className="h-5 w-5 text-primary" /> Quick actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-label={a.label}
            className="card-premium sheen group flex aspect-[4/3] flex-col items-center justify-center gap-2 p-3 text-center outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring sm:aspect-[3/2]"
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] transition-transform group-hover:scale-110',
                a.tone,
              )}
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold text-foreground">{a.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
