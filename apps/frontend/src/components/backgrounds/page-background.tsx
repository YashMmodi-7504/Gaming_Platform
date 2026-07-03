'use client';

import { cn } from '@gaming-platform/ui';

/**
 * Per-page background — minimal premium (PPP-11).
 *
 * A soft pastel wash tinted per route, a whisper-faint grid, and at most two
 * very-low-opacity orbs. No busy decorative shapes: this keeps every non-home
 * page calm (premium-SaaS look) and cheap to paint — few nodes, one slow drift
 * animation, GPU transforms/opacity only, reduced-motion aware. The home page
 * keeps the vibrant CinematicBackground (mounted elsewhere).
 */
export type BackgroundVariant =
  | 'casino'
  | 'crash'
  | 'dice'
  | 'roulette'
  | 'sports'
  | 'racing'
  | 'arcade'
  | 'esports';

/** Soft pastel base — high lightness, low saturation, settles to near-white. */
const BASES: Record<BackgroundVariant, string> = {
  casino: 'radial-gradient(115% 80% at 50% -12%, hsl(43 70% 96%), hsl(263 55% 97.5%) 45%, hsl(222 40% 99%) 100%)',
  crash: 'radial-gradient(115% 80% at 50% -12%, hsl(263 60% 97%), hsl(210 65% 97.5%) 45%, hsl(222 40% 99%) 100%)',
  dice: 'radial-gradient(115% 80% at 50% -12%, hsl(190 60% 96.5%), hsl(263 50% 97.5%) 50%, hsl(222 40% 99%) 100%)',
  roulette: 'radial-gradient(115% 80% at 50% -12%, hsl(350 60% 97%), hsl(263 50% 97.5%) 45%, hsl(222 40% 99%) 100%)',
  sports: 'radial-gradient(115% 80% at 50% -12%, hsl(152 50% 96.5%), hsl(210 60% 97.5%) 45%, hsl(222 40% 99%) 100%)',
  racing: 'radial-gradient(115% 80% at 50% -12%, hsl(24 70% 96.5%), hsl(263 50% 97.5%) 45%, hsl(222 40% 99%) 100%)',
  arcade: 'radial-gradient(115% 80% at 50% -12%, hsl(190 65% 96.5%), hsl(326 55% 97.5%) 50%, hsl(222 40% 99%) 100%)',
  esports: 'radial-gradient(115% 80% at 50% -12%, hsl(268 60% 97%), hsl(43 60% 97%) 55%, hsl(222 40% 99%) 100%)',
};

/** One subtle accent tint per route (kept very low opacity). */
const ACCENTS: Record<BackgroundVariant, string> = {
  casino: 'bg-gold/10',
  crash: 'bg-accent/10',
  dice: 'bg-accent/10',
  roulette: 'bg-destructive/[0.07]',
  sports: 'bg-emerald/10',
  racing: 'bg-warning/10',
  arcade: 'bg-violet/10',
  esports: 'bg-violet/10',
};

export function PageBackground({ variant }: { variant: BackgroundVariant }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: BASES[variant] }} />
      <div className="bg-grid absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {/* Two soft, slow orbs — the only motion. */}
      <div className={cn('absolute -left-24 top-[-6%] h-96 w-96 rounded-full blur-[140px] animate-float-slow', ACCENTS[variant])} />
      <div className={cn('absolute -right-24 bottom-[-8%] h-96 w-96 rounded-full blur-[140px] animate-float', 'bg-primary/[0.06]')} />
      {/* Clean white fade at the very top so headers sit on calm ground. */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/60 to-transparent" />
    </div>
  );
}
