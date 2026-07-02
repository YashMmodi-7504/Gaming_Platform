'use client';

import { cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDot, Club, Dice5, Rocket, Spade, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { SectionHeading } from '@/components/marketing/landing-sections';

/* ------------------------------------------------------------------ */
/* Deterministic seeds (SSR-safe). After mount, entries stream in.     */
/* ------------------------------------------------------------------ */

interface Entry {
  id: number;
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral' | 'gold';
}

const NAMES = [
  'Phoenix',
  'NovaQueen',
  'Vortex',
  'GoldRush',
  'Zenith',
  'Mirage',
  'ApexWolf',
  'Lumen',
  'Specter',
  'Onyx',
  'Cobalt',
  'Riptide',
];

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

type Gen = (i: number) => Omit<Entry, 'id'>;

const crashGen: Gen = (i) => {
  const seq = [2.41, 1.18, 7.92, 1.04, 3.55, 12.7, 1.97, 4.36, 1.45, 25.3];
  const v = pick(seq, i);
  return { label: 'Round', value: `${v.toFixed(2)}×`, tone: v >= 2 ? 'good' : 'bad' };
};
const diceGen: Gen = (i) => {
  const seq = [73.4, 12.9, 48.2, 91.0, 4.6, 56.4, 27.1, 88.8, 33.3, 66.6];
  const v = pick(seq, i);
  return { label: 'Roll', value: v.toFixed(2), tone: v > 50 ? 'good' : 'bad' };
};
const rouletteGen: Gen = (i) => {
  const seq = [17, 0, 32, 5, 26, 14, 3, 0, 21, 8];
  const n = pick(seq, i);
  return {
    label: pick(NAMES, i + 2),
    value: String(n),
    tone: n === 0 ? 'good' : REDS.has(n) ? 'bad' : 'neutral',
  };
};
const blackjackGen: Gen = (i) => {
  const seq = ['21 ♠', '19 ♥', 'Bust', '20 ♦', 'BJ!', '18 ♣', '17 ♠', '21 ♥'];
  const v = pick(seq, i);
  return { label: pick(NAMES, i + 1), value: v, tone: v === 'Bust' ? 'bad' : v === 'BJ!' ? 'gold' : 'good' };
};
const teenPattiGen: Gen = (i) => {
  const amt = pick([1240, 860, 3120, 540, 2150, 980, 4300, 1560], i);
  return { label: pick(NAMES, i + 4), value: `+$${amt.toLocaleString()}`, tone: 'good' };
};
const sportsGen: Gen = (i) => {
  const seq = ['LAK 2–1 SEA', 'ARS 3–0 EVE', 'BOS 110–104', 'PSG 1–1 LYO', 'NYK 98–95'];
  return { label: 'Settled', value: pick(seq, i), tone: 'neutral' };
};

const COLUMNS: {
  key: string;
  title: string;
  icon: typeof Rocket;
  href: string;
  gen: Gen;
  accent: string;
}[] = [
  { key: 'crash', title: 'Crash', icon: Rocket, href: '/crash', gen: crashGen, accent: 'text-pink' },
  { key: 'dice', title: 'Dice', icon: Dice5, href: '/dice', gen: diceGen, accent: 'text-primary' },
  { key: 'roulette', title: 'Roulette', icon: CircleDot, href: '/roulette', gen: rouletteGen, accent: 'text-destructive' },
  { key: 'bj', title: 'Blackjack', icon: Club, href: '/casino', gen: blackjackGen, accent: 'text-emerald' },
  { key: 'tp', title: 'Teen Patti', icon: Spade, href: '/casino', gen: teenPattiGen, accent: 'text-violet' },
  { key: 'sports', title: 'Sports', icon: TrendingUp, href: '/sportsbook', gen: sportsGen, accent: 'text-accent' },
];

const toneClass: Record<Entry['tone'], string> = {
  good: 'text-emerald',
  bad: 'text-destructive',
  neutral: 'text-foreground',
  gold: 'text-gold',
};

function LiveColumn({ col }: { col: (typeof COLUMNS)[number] }) {
  const seed = useRef(0);
  const [entries, setEntries] = useState<Entry[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({ id: i, ...col.gen(i) })),
  );

  useEffect(() => {
    seed.current = 5;
    // Update every 30–60s with the NEXT value from a fixed sequence (no random
    // per-render churn) so the feed reads as "latest completed rounds".
    const period = 30_000 + (col.key.charCodeAt(0) % 6) * 5_000;
    const id = setInterval(() => {
      seed.current += 1;
      const next: Entry = { id: seed.current, ...col.gen(seed.current) };
      setEntries((prev) => [next, ...prev].slice(0, 5));
    }, period);
    return () => clearInterval(id);
  }, [col]);

  const Icon = col.icon;
  return (
    <div className="card-premium overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', col.accent)} />
          <span className="font-display text-sm font-bold">{col.title}</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
        </span>
      </div>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-between rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs"
            >
              <span className="truncate text-muted-foreground">{e.label}</span>
              <span className={cn('font-mono font-bold tabular-nums', toneClass[e.tone])}>
                {e.value}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function GlobalLiveFeed() {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Trophy className="h-5 w-5 text-gold" />}
        title="Global live feed"
        action={{ label: 'Leaderboard', href: '/leaderboards' }}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {COLUMNS.map((col) => (
          <LiveColumn key={col.key} col={col} />
        ))}
      </div>
    </section>
  );
}
