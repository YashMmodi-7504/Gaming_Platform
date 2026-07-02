'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Flame, History, Snowflake, TrendingDown, TrendingUp } from 'lucide-react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { diceHistory, diceSession, hotColdNumbers } from '@/lib/game-live';

/** Reusable dice statistics panel: session, hot/cold, probability, history. */
export function DiceStatsPanel({ seed }: { seed: string }) {
  const session = diceSession(seed);
  const { hot, cold } = hotColdNumbers(seed);
  const history = diceHistory(seed, 24);
  const wins = history.filter((r) => r.win).length;
  const winPct = Math.round((wins / history.length) * 100);
  const profitUp = session.profit >= 0;

  return (
    <div className="space-y-4">
      {/* Session */}
      <div className="card-premium p-4">
        <h3 className="mb-3 font-display text-sm font-bold">Session</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Rolls" value={session.rolls} tone="text-foreground" />
          <Stat label="Win rate" value={session.winRate} suffix="%" tone="text-emerald" />
          <div className="rounded-lg bg-black/[0.03] px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit</p>
            <p className={cn('flex items-center gap-1 font-mono text-sm font-bold tabular-nums', profitUp ? 'text-emerald' : 'text-destructive')}>
              {profitUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {profitUp ? '+' : '−'}${Math.abs(session.profit).toLocaleString('en-US')}
            </p>
          </div>
          <Stat label="Best streak" value={session.bestStreak} tone="text-gold" />
        </div>
      </div>

      {/* Probability */}
      <div className="card-premium p-4">
        <h3 className="mb-2 font-display text-sm font-bold">Recent distribution</h3>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-emerald">Over 50 · {winPct}%</span>
          <span className="text-destructive">Under 50 · {100 - winPct}%</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-black/5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${winPct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald to-accent"
          />
          <div className="h-full flex-1 bg-gradient-to-r from-destructive/70 to-destructive" />
        </div>
      </div>

      {/* Hot / cold */}
      <div className="card-premium p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <Flame className="h-3.5 w-3.5" /> Hot
            </p>
            <div className="flex flex-wrap gap-1.5">
              {hot.map((n, i) => (
                <span key={i} className="rounded-lg bg-destructive/10 px-2 py-1 font-mono text-xs font-bold tabular-nums text-destructive">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Snowflake className="h-3.5 w-3.5" /> Cold
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cold.map((n, i) => (
                <span key={i} className="rounded-lg bg-accent/10 px-2 py-1 font-mono text-xs font-bold tabular-nums text-accent">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History timeline */}
      <div className="card-premium p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <History className="h-4 w-4 text-accent" /> History
        </h3>
        <div className="flex flex-wrap gap-1">
          {history.map((r) => (
            <span
              key={r.id}
              title={`${r.value} · ${r.win ? 'win' : 'loss'}`}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md font-mono text-[10px] font-bold tabular-nums',
                r.win ? 'bg-emerald/12 text-emerald ring-1 ring-inset ring-emerald/25' : 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25',
              )}
            >
              {r.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-sm font-bold tabular-nums', tone)}>
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
    </div>
  );
}
