'use client';

import { Coins, Rocket, Trophy } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Live ticker — thin glass marquee under the hero                            */
/* Deterministic stream (seed by index, no Date.now / Math.random).           */
/* -------------------------------------------------------------------------- */

type TickerItem =
  | { kind: 'win'; name: string; game: string; amount: number }
  | { kind: 'jackpot'; game: string; amount: number }
  | { kind: 'tournament'; name: string };

const ITEMS: TickerItem[] = [
  { kind: 'win', name: 'Phoenix', game: 'Crash', amount: 12450 },
  { kind: 'jackpot', game: 'Mega Moolah', amount: 482300 },
  { kind: 'win', name: 'NovaQueen', game: 'Roulette', amount: 8230 },
  { kind: 'tournament', name: 'Weekend Showdown' },
  { kind: 'win', name: 'GoldRush', game: 'Blackjack', amount: 21500 },
  { kind: 'win', name: 'Vortex', game: 'Dice', amount: 3120 },
  { kind: 'jackpot', game: 'Gates of Olympus', amount: 156900 },
  { kind: 'win', name: 'Zenith', game: 'Crash', amount: 5400 },
  { kind: 'tournament', name: 'Crash Race' },
  { kind: 'win', name: 'Mirage', game: 'Sports', amount: 9870 },
  { kind: 'win', name: 'Lumen', game: 'Teen Patti', amount: 15640 },
  { kind: 'jackpot', game: 'Divine Fortune', amount: 264500 },
  { kind: 'win', name: 'Apex', game: 'Roulette', amount: 4300 },
  { kind: 'tournament', name: 'High Roller Cup' },
];

function fmt(n: number): string {
  return n.toLocaleString();
}

function TickerEntry({ item }: { item: TickerItem }) {
  if (item.kind === 'jackpot') {
    return (
      <span className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-gold" />
        <span className="font-semibold text-gold">JACKPOT</span>
        <span className="text-muted-foreground">hit on {item.game}</span>
        <span className="font-mono font-bold tabular-nums text-gold">${fmt(item.amount)}</span>
      </span>
    );
  }
  if (item.kind === 'tournament') {
    return (
      <span className="flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-violet" />
        <span className="font-semibold text-violet">{item.name}</span>
        <span className="text-muted-foreground">starting soon</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Rocket className="h-3.5 w-3.5 text-primary" />
      <span className="font-semibold text-foreground">{item.name}</span>
      <span className="text-muted-foreground">won</span>
      <span className="font-mono font-bold tabular-nums text-emerald">+${fmt(item.amount)}</span>
      <span className="text-muted-foreground">on {item.game}</span>
    </span>
  );
}

export function LiveTicker() {
  // Duplicate track for a seamless loop.
  const track = [...ITEMS, ...ITEMS];
  return (
    <section
      aria-label="Live activity ticker"
      className="glass relative flex items-center overflow-hidden rounded-2xl border border-black/10 py-2.5 [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]"
    >
      <span className="relative z-10 ml-3 mr-1 hidden shrink-0 items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive ring-1 ring-inset ring-destructive/40 sm:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
      </span>
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap text-sm">
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <TickerEntry item={item} />
            <span className="h-1 w-1 rounded-full bg-foreground/20" aria-hidden />
          </span>
        ))}
      </div>
    </section>
  );
}
