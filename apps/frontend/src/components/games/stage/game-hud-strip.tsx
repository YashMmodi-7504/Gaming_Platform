'use client';

import { cn } from '@gaming-platform/ui';
import { Coins, Eye, Flame, TrendingDown, TrendingUp, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { livePlayers } from '@/lib/game-live';
import { useDemoWallet } from '@/stores/demo-wallet';
import { usePlayerProfile } from '@/stores/player-profile';

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Premium presentation HUD strip for game pages. Reads the real demo wallet +
 * level; session/streak/watchers are deterministic. Never touches gameplay.
 */
export function GameHudStrip({ seed }: { seed: string }) {
  const balance = useDemoWallet((s) => s.balance);
  const level = usePlayerProfile((s) => s.level);
  const [phase, setPhase] = useState(0);

  const h = hash(`hud-${seed}`);
  const profit = (h % 2 === 0 ? 1 : -1) * (400 + (h % 40) * 90);
  const streak = 2 + (h % 8);
  const friends = 1 + (h % 5);
  const up = profit >= 0;

  useEffect(() => {
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion');
    if (reduced) return;
    const id = window.setInterval(() => setPhase((p) => p + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="glass-strong flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 sm:gap-3 sm:px-4">
      <Pill icon={<Zap className="h-3.5 w-3.5" />} label="Level" tone="text-violet">
        <AnimatedNumber value={level} />
      </Pill>
      <Pill icon={<Coins className="h-3.5 w-3.5" />} label="Wallet" tone="text-gold">
        <AnimatedNumber value={balance} />
      </Pill>
      <Pill
        icon={up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        label="Session"
        tone={up ? 'text-emerald' : 'text-destructive'}
      >
        {up ? '+' : '−'}
        <AnimatedNumber value={Math.abs(profit)} />
      </Pill>
      <Pill icon={<Flame className="h-3.5 w-3.5" />} label="Streak" tone="text-pink">
        {streak}
      </Pill>
      <Pill icon={<Users className="h-3.5 w-3.5" />} label="Online" tone="text-accent" live>
        <AnimatedNumber value={livePlayers(seed, phase)} />
      </Pill>
      <Pill icon={<Eye className="h-3.5 w-3.5" />} label="Watching" tone="text-muted-foreground">
        {friends}
      </Pill>
    </div>
  );
}

function Pill({
  icon,
  label,
  tone,
  live,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]', tone)}>
        {live ? (
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            {icon}
          </span>
        ) : (
          icon
        )}
      </span>
      <div className="leading-tight">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('font-mono text-sm font-bold tabular-nums', tone)}>{children}</p>
      </div>
    </div>
  );
}
