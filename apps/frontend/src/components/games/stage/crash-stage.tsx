'use client';

import { cn } from '@gaming-platform/ui';
import type { ReactNode } from 'react';

/**
 * Cinematic presentation frame for the (untouched) CrashGame. All decoration is
 * `pointer-events-none` and sits behind/around the game (which stays on top and
 * fully interactive), so gameplay is unaffected. GPU transforms only; the
 * animate-* classes are disabled globally under reduced motion.
 */

const PARTICLES = [
  { left: '10%', top: '20%', size: 5, cls: 'animate-float' },
  { left: '86%', top: '30%', size: 4, cls: 'animate-float-slow' },
  { left: '22%', top: '72%', size: 6, cls: 'animate-float-slow' },
  { left: '78%', top: '64%', size: 4, cls: 'animate-float' },
  { left: '48%', top: '12%', size: 3, cls: 'animate-float' },
  { left: '62%', top: '84%', size: 5, cls: 'animate-float-slow' },
] as const;

export function CrashStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-black/[0.06] bg-gradient-to-b from-primary/[0.07] via-transparent to-accent/[0.06] p-3 shadow-elevated sm:p-4',
        className,
      )}
    >
      {/* sky light rays */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{ background: 'radial-gradient(130% 80% at 50% -20%, hsl(var(--primary) / 0.16), transparent 62%)' }}
      />
      {/* grid haze */}
      <span aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-[0.12]" />

      {/* launch-pad energy rings */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-1/2 h-36 w-36 -translate-x-1/2 animate-pulse-ring rounded-full border border-accent/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-1/2 h-36 w-36 -translate-x-1/2 animate-pulse-ring rounded-full border border-primary/25"
        style={{ animationDelay: '1s' }}
      />
      {/* exhaust bloom */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 animate-glow-pulse"
        style={{ background: 'radial-gradient(70% 100% at 50% 120%, hsl(var(--accent) / 0.26), transparent 60%)' }}
      />

      {/* atmospheric particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className={cn('pointer-events-none absolute rounded-full bg-white/70 shadow-glow-sm ring-1 ring-white/50', p.cls)}
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: `${i * 0.5}s` }}
        />
      ))}

      {/* Interactive game — on top, unchanged */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
