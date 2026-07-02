'use client';

import { cn } from '@gaming-platform/ui';
import { Dice5 } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Cinematic casino-table frame for the (untouched) DiceGame. All decoration is
 * `pointer-events-none` behind the game (which stays interactive on top). GPU
 * transforms only; animate-* classes respect the global reduced-motion setting.
 */

const DICE = [
  { left: '6%', top: '18%', size: 40, rot: -12, cls: 'animate-float' },
  { left: '88%', top: '24%', size: 34, rot: 14, cls: 'animate-float-slow' },
  { left: '12%', top: '74%', size: 30, rot: 8, cls: 'animate-float-slow' },
  { left: '84%', top: '70%', size: 44, rot: -8, cls: 'animate-float' },
] as const;

const SPARKS = [
  { left: '30%', top: '30%', size: 4 },
  { left: '70%', top: '44%', size: 3 },
  { left: '50%', top: '80%', size: 5 },
  { left: '40%', top: '58%', size: 3 },
] as const;

export function DiceStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-b from-emerald/[0.10] via-transparent to-gold/[0.06] p-3 shadow-elevated sm:p-4',
        className,
      )}
    >
      {/* luxury table felt sheen + spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 60% at 50% 0%, hsl(var(--gold) / 0.14), transparent 55%)' }}
      />
      <span aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-[0.10]" />
      {/* golden reflection sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 top-4 h-24 rotate-6 bg-gradient-to-r from-transparent via-gold/20 to-transparent blur-2xl animate-glow-pulse"
      />
      {/* table shadow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-2 h-10 rounded-full bg-black/20 blur-2xl"
      />

      {/* floating dice silhouettes */}
      {DICE.map((d, i) => (
        <Dice5
          key={i}
          aria-hidden
          className={cn('pointer-events-none absolute text-gold/20', d.cls)}
          style={{ left: d.left, top: d.top, width: d.size, height: d.size, transform: `rotate(${d.rot}deg)`, animationDelay: `${i * 0.6}s` }}
        />
      ))}
      {/* golden sparkles */}
      {SPARKS.map((s, i) => (
        <span
          key={`s${i}`}
          aria-hidden
          className="pointer-events-none absolute animate-glow-pulse rounded-full bg-gold/70 shadow-glow-gold"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${i * 0.4}s` }}
        />
      ))}

      {/* Interactive game — on top, unchanged */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
