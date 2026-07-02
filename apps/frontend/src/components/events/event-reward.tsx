'use client';

import { cn } from '@gaming-platform/ui';
import { Gift } from 'lucide-react';

/** Reusable reward chip used across event cards and heroes. */
export function EventReward({ reward, className }: { reward: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold ring-1 ring-inset ring-gold/30',
        className,
      )}
    >
      <Gift className="h-3.5 w-3.5" aria-hidden />
      {reward}
    </span>
  );
}
