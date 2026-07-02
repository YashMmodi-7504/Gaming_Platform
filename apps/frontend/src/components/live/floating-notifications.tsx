'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/* Floating notifications — bottom-left popups on a deterministic queue.       */
/* No random-per-render: the queue is a fixed, index-seeded sequence.          */
/* Respects reduced-motion by skipping the auto-popup loop entirely.           */
/* -------------------------------------------------------------------------- */

interface Popup {
  id: number;
  kind: 'win' | 'tournament';
  title: string;
  detail: string;
}

const QUEUE: Omit<Popup, 'id'>[] = [
  { kind: 'win', title: 'Phoenix won $12,450', detail: 'on Crash · 24.9× multiplier' },
  { kind: 'tournament', title: 'Weekend Showdown starting', detail: 'Register now · $1M prize pool' },
  { kind: 'win', title: 'GoldRush won $21,500', detail: 'on Blackjack · big win' },
  { kind: 'win', title: 'NovaQueen won $8,230', detail: 'on Roulette · straight up' },
  { kind: 'tournament', title: 'Crash Race is live', detail: 'Climb the leaderboard · $50K' },
  { kind: 'win', title: 'Lumen won $15,640', detail: 'on Teen Patti · royal hand' },
  { kind: 'win', title: 'Mirage won $9,870', detail: 'on Sports · accumulator' },
  { kind: 'tournament', title: 'High Roller Cup tonight', detail: 'VIP entry · $250K pool' },
];

const SHOW_MS = 6500; // visible duration per popup
const GAP_MS = 13_000; // base gap between popups (~12–18s with jitter below)

export function FloatingNotifications() {
  const [active, setActive] = useState<Popup[]>([]);
  const idxRef = useRef(0);
  const uidRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // skip auto-popups under reduced motion

    let showTimer: ReturnType<typeof setTimeout>;
    let queueTimer: ReturnType<typeof setTimeout>;

    const dismissAfter = (id: number) => {
      showTimer = setTimeout(() => {
        setActive((prev) => prev.filter((p) => p.id !== id));
      }, SHOW_MS);
    };

    const enqueue = () => {
      const base = QUEUE[idxRef.current % QUEUE.length]!;
      const id = ++uidRef.current;
      const popup: Popup = { ...base, id };
      idxRef.current += 1;
      // Keep at most 2 visible; drop the oldest when a third arrives.
      setActive((prev) => [...prev, popup].slice(-2));
      dismissAfter(id);
      // Deterministic jitter on the gap (12–18s) seeded by queue index.
      const jitter = (idxRef.current % 4) * 1500; // 0, 1.5, 3, 4.5s
      queueTimer = setTimeout(enqueue, GAP_MS + jitter);
    };

    // First popup after a short delay so the page settles.
    queueTimer = setTimeout(enqueue, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(queueTimer);
    };
  }, []);

  const dismiss = (id: number) => setActive((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[min(92vw,20rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {active.map((p) => {
          const accent = p.kind === 'tournament' ? 'text-violet' : 'text-gold';
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: -24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="glass-strong sheen pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-black/10 p-3 shadow-glow-sm"
            >
              <span className="bg-aurora absolute inset-0 opacity-10" aria-hidden />
              <span
                aria-hidden
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card/70 text-lg ring-1 ring-inset ring-black/10 ${accent}`}
              >
                {p.kind === 'tournament' ? '🏆' : '🎉'}
              </span>
              <div className="relative min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-bold text-foreground">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">{p.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(p.id)}
                aria-label="Dismiss notification"
                className="relative -m-1 rounded-md p-1 text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
