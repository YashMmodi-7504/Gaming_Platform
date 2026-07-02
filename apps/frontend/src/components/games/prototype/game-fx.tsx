'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Win/lose result FX overlay for the playable prototypes: confetti + a coin
 * explosion + a "big win" flash on wins, driven by a bumping `trigger` key so it
 * re-fires each round. GPU transforms only; skipped under reduced-motion.
 */
export interface FxSignal {
  key: number;
  type: 'win' | 'lose' | null;
  amount?: number;
}

const CONFETTI = Array.from({ length: 28 }, (_, i) => i);
const COINS = Array.from({ length: 16 }, (_, i) => i);
const COLORS = ['#f59e0b', '#ec4899', '#22d3ee', '#7c3aed', '#22c55e'];

export function GameFx({ trigger }: { trigger: FxSignal }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }, []);

  if (reduce || trigger.type !== 'win') return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        <div key={trigger.key} className="absolute inset-0">
          {/* flash */}
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-t from-gold/30 to-transparent"
          />
          {/* big win text */}
          {trigger.amount && trigger.amount > 0 ? (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 20 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 1, 0], y: [-0, -10, -18, -28] }}
              transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1] }}
              className="absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-4xl font-bold text-gradient-gold drop-shadow"
            >
              +{trigger.amount.toLocaleString()}
            </motion.div>
          ) : null}
          {/* confetti */}
          {CONFETTI.map((i) => {
            const x = (i / CONFETTI.length) * 100;
            return (
              <motion.span
                key={`c${i}`}
                initial={{ top: '-6%', left: `${x}%`, opacity: 1, rotate: 0 }}
                animate={{ top: '110%', rotate: 360 + i * 20, opacity: [1, 1, 0] }}
                transition={{ duration: 1.6 + (i % 5) * 0.2, ease: 'easeIn', delay: (i % 7) * 0.03 }}
                className="absolute h-2.5 w-1.5 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
            );
          })}
          {/* coin explosion from center */}
          {COINS.map((i) => {
            const ang = (i / COINS.length) * Math.PI * 2;
            return (
              <motion.span
                key={`k${i}`}
                initial={{ left: '50%', top: '50%', opacity: 1, scale: 1 }}
                animate={{
                  left: `${50 + Math.cos(ang) * 34}%`,
                  top: `${50 + Math.sin(ang) * 30}%`,
                  opacity: [1, 1, 0],
                  scale: [1, 1.2, 0.6],
                }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold to-warning text-[9px] font-bold text-white shadow-glow-gold"
              >
                $
              </motion.span>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}
