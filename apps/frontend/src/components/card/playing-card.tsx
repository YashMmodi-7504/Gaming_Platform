'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

const SUIT_SYMBOL: Record<string, string> = { H: '♥', D: '♦', C: '♣', S: '♠', X: '★' };
const RANK_LABEL: Record<string, string> = { T: '10' };

function parse(code: string): { rank: string; suit: string; red: boolean; joker: boolean } {
  const suit = code.slice(-1);
  const rankCode = code.slice(0, code.length - 1);
  return {
    rank: RANK_LABEL[rankCode] ?? rankCode,
    suit: SUIT_SYMBOL[suit] ?? '?',
    red: suit === 'H' || suit === 'D',
    joker: suit === 'X',
  };
}

interface PlayingCardProps {
  /** 2-char card code (e.g. `AS`, `TH`, `XX`), or undefined for face-down. */
  code?: string;
  faceDown?: boolean;
  index?: number;
  small?: boolean;
}

/** A single playing card with a deal-in and flip animation. */
export function PlayingCard({ code, faceDown, index = 0, small }: PlayingCardProps) {
  const showBack = faceDown || !code;
  const card = code ? parse(code) : null;
  // Larger, readable cards that scale up on bigger screens (layout sizing only).
  const size = small
    ? 'h-16 w-11 text-sm sm:h-20 sm:w-14 sm:text-base lg:h-24 lg:w-16 lg:text-lg'
    : 'h-24 w-16 text-lg sm:h-28 sm:w-20 sm:text-xl lg:h-36 lg:w-24 lg:text-2xl';

  return (
    <motion.div
      initial={{ y: -30, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: showBack ? 180 : 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn('relative shrink-0 rounded-lg', size)}
    >
      {showBack ? (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-primary/30 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 shadow-md">
          <span className="text-xl text-primary/70 lg:text-3xl">◆</span>
        </div>
      ) : (
        <div
          className={cn(
            'flex h-full w-full flex-col justify-between rounded-lg border border-border/70 bg-white p-1.5 font-bold shadow-md ring-1 ring-black/5',
            card?.red ? 'text-destructive' : card?.joker ? 'text-primary' : 'text-foreground',
          )}
        >
          <span className="leading-none">{card?.joker ? 'JOKER' : card?.rank}</span>
          <span className="self-center text-2xl leading-none sm:text-3xl lg:text-4xl">{card?.suit}</span>
          <span className="rotate-180 self-end leading-none">{card?.joker ? '' : card?.rank}</span>
        </div>
      )}
    </motion.div>
  );
}
