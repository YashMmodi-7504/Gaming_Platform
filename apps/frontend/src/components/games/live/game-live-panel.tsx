'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { biggestWins, liveChat, livePlayers } from '@/lib/game-live';

const TONE: Record<'good' | 'neutral' | 'gold', string> = {
  good: 'text-emerald',
  neutral: 'text-foreground',
  gold: 'text-gold',
};

/**
 * Reusable "live" side panel for game pages: live player count, biggest wins
 * and a deterministic chat feed. Backend-free; ticks are reduced-motion aware.
 */
export function GameLivePanel({ seed }: { seed: string }) {
  const [phase, setPhase] = useState(0);
  const wins = biggestWins(6);
  const chat = liveChat(seed, 9);

  useEffect(() => {
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion');
    if (reduced) return;
    const id = window.setInterval(() => setPhase((p) => p + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Live players */}
      <div className="card-premium flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/10 text-emerald ring-1 ring-inset ring-emerald/30">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> Players online
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-emerald">
            <AnimatedNumber value={livePlayers(seed, phase)} />
          </p>
        </div>
      </div>

      {/* Biggest wins */}
      <div className="card-premium p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <Trophy className="h-4 w-4 text-gold" /> Biggest wins today
        </h3>
        <ul className="space-y-1.5">
          {wins.map((w, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{w.name}</span>
                <span className="shrink-0 text-muted-foreground">{w.game}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono tabular-nums text-accent">{w.mult.toFixed(2)}×</span>
                <span className="font-mono font-bold tabular-nums text-emerald">
                  +${w.amount.toLocaleString('en-US')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Live chat (deterministic, visual) */}
      <div className="card-premium flex flex-col p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
          <MessageSquare className="h-4 w-4 text-accent" /> Live chat
        </h3>
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chat.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: Math.min(m.id * 0.03, 0.3) }}
              className="text-xs leading-tight"
            >
              <span className="font-semibold text-primary">{m.name}</span>{' '}
              <span className={cn(TONE[m.tone])}>{m.text}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white/[0.03] px-3 py-2">
          <input
            aria-label="Chat message"
            placeholder="Say something…"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </div>
  );
}
