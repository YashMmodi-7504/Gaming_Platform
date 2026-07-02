'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

/** Pip layout (3×3 grid positions) for standard d6 faces 1-6. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface DieFaceProps {
  value: number;
  /** Number of tumble spins for the roll animation (deterministic per die). */
  spins?: number;
  rolling?: boolean;
  index?: number;
  size?: number;
  highlight?: boolean;
}

/**
 * A single die. For 1-6 it renders classic pips; for higher-sided dice it shows
 * the numeral. The roll animation tumbles a deterministic number of spins.
 */
export function DieFace({ value, spins = 4, rolling, index = 0, size = 56, highlight }: DieFaceProps) {
  const isPipFace = value >= 1 && value <= 6;

  return (
    <motion.div
      initial={false}
      animate={rolling ? { rotate: [0, spins * 180, spins * 360], scale: [1, 1.08, 1] } : { rotate: 0 }}
      transition={{ duration: rolling ? 0.9 : 0.2, ease: 'easeOut', delay: index * 0.06 }}
      className={cn(
        'flex items-center justify-center rounded-xl border-2 bg-gradient-to-br from-white to-slate-100 shadow-xl',
        highlight ? 'border-gold ring-2 ring-gold/50' : 'border-slate-200',
      )}
      style={{ width: size, height: size }}
    >
      {isPipFace ? (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 p-2">
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex items-center justify-center',
                PIPS[value]?.includes(i) ? '' : 'opacity-0',
              )}
            >
              <span className="block h-2 w-2 rounded-full bg-gradient-to-br from-primary to-violet shadow-sm" />
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xl font-bold text-primary">{value}</span>
      )}
    </motion.div>
  );
}
