'use client';

import { cn } from '@gaming-platform/ui';

/**
 * Per-page immersive animated background. Pure CSS (GPU transforms/opacity only)
 * so it's cheap and 60fps, light-themed to match the platform, and honors
 * reduced-motion (the `animate-*` utilities are disabled globally under it).
 * Fixed behind content; each route mounts a themed variant via RouteBackground.
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

const BASES: Record<BackgroundVariant, string> = {
  casino: 'radial-gradient(120% 90% at 50% -10%, hsl(43 95% 92%), hsl(263 80% 96%) 45%, hsl(222 40% 98%) 100%)',
  crash: 'radial-gradient(120% 90% at 50% -10%, hsl(263 90% 94%), hsl(210 90% 95%) 45%, hsl(222 45% 98%) 100%)',
  dice: 'radial-gradient(120% 90% at 50% -10%, hsl(190 85% 93%), hsl(263 80% 96%) 50%, hsl(222 40% 98%) 100%)',
  roulette: 'radial-gradient(120% 90% at 50% -10%, hsl(350 85% 94%), hsl(263 80% 96%) 45%, hsl(222 40% 98%) 100%)',
  sports: 'radial-gradient(120% 90% at 50% -10%, hsl(152 70% 92%), hsl(210 85% 95%) 45%, hsl(222 40% 98%) 100%)',
  racing: 'radial-gradient(120% 90% at 50% -10%, hsl(24 90% 92%), hsl(263 80% 96%) 45%, hsl(222 40% 98%) 100%)',
  arcade: 'radial-gradient(120% 90% at 50% -10%, hsl(190 90% 93%), hsl(326 85% 95%) 50%, hsl(222 40% 98%) 100%)',
  esports: 'radial-gradient(120% 90% at 50% -10%, hsl(268 88% 94%), hsl(43 90% 94%) 55%, hsl(222 40% 98%) 100%)',
};

function Orb({ className }: { className: string }) {
  return <div className={cn('absolute rounded-full blur-[120px]', className)} />;
}

export function PageBackground({ variant }: { variant: BackgroundVariant }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: BASES[variant] }} />
      <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      {renderScene(variant)}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent" />
    </div>
  );
}

function renderScene(v: BackgroundVariant) {
  switch (v) {
    case 'casino':
      return (
        <>
          <Orb className="left-[8%] top-[12%] h-80 w-80 animate-float-slow bg-gold/25" />
          <Orb className="right-[10%] top-[8%] h-72 w-72 animate-float bg-pink/20" />
          <Orb className="left-1/3 bottom-[6%] h-96 w-96 animate-float-slow bg-primary/15" />
          {/* poker chips */}
          {chip('left-[12%] top-[26%]', 'border-gold/50', 0)}
          {chip('right-[16%] top-[20%]', 'border-primary/45', 1.4)}
          {chip('left-[22%] bottom-[22%]', 'border-pink/45', 0.7)}
          {/* floating dice */}
          {cube('right-[24%] bottom-[26%] border-accent/45', 1.1)}
          {cube('left-1/2 top-[16%] border-violet/45', 0.4)}
          {/* playing card */}
          {card('right-[30%] top-[38%] border-gold/50', 0.9)}
        </>
      );
    case 'crash':
      return (
        <>
          <Orb className="left-1/2 top-[6%] h-[26rem] w-[26rem] -translate-x-1/2 animate-glow-pulse bg-accent/20" />
          <Orb className="right-[8%] bottom-[10%] h-80 w-80 animate-float bg-pink/20" />
          {/* rockets rising */}
          {rocket('left-[16%]', 0)}
          {rocket('left-[46%]', 1.6)}
          {rocket('right-[18%]', 0.8)}
          {/* electric streaks */}
          <div className="absolute left-[-10%] top-1/3 h-1 w-1/2 rotate-[16deg] animate-float bg-gradient-to-r from-transparent via-accent/40 to-transparent blur-[2px]" />
          <div className="absolute right-[-10%] top-2/3 h-1 w-1/2 -rotate-[12deg] animate-float-slow bg-gradient-to-r from-transparent via-primary/40 to-transparent blur-[2px]" />
          {sparks('bg-primary/60')}
        </>
      );
    case 'dice':
      return (
        <>
          <Orb className="left-[10%] top-[16%] h-80 w-80 animate-float-slow bg-accent/20" />
          <Orb className="right-[12%] bottom-[14%] h-80 w-80 animate-float bg-primary/18" />
          {cube('left-[18%] top-[24%] border-primary/50', 0)}
          {cube('right-[22%] top-[18%] border-accent/50', 1.2)}
          {cube('left-[40%] bottom-[20%] border-violet/50', 0.6)}
          {cube('right-[36%] bottom-[30%] border-pink/50', 1.8)}
          {cube('left-[62%] top-[30%] border-gold/50', 0.9)}
        </>
      );
    case 'roulette':
      return (
        <>
          <Orb className="left-1/2 top-[10%] h-[28rem] w-[28rem] -translate-x-1/2 animate-spin-slow bg-destructive/12" />
          <Orb className="right-[12%] bottom-[12%] h-72 w-72 animate-float bg-gold/20" />
          {chip('left-[16%] top-[26%]', 'border-destructive/45', 0)}
          {chip('right-[18%] top-[24%]', 'border-foreground/30', 1.2)}
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 animate-spin-slow rounded-full border-[3px] border-dashed border-gold/25" />
        </>
      );
    case 'sports':
      return (
        <>
          <Orb className="left-[8%] top-[14%] h-80 w-80 animate-float-slow bg-emerald/20" />
          <Orb className="right-[10%] top-[10%] h-72 w-72 animate-float bg-accent/18" />
          {/* flood lights from the corners */}
          <div className="absolute left-[6%] top-[-12%] h-[130%] w-40 rotate-[18deg] animate-float bg-gradient-to-b from-warning/25 via-transparent to-transparent blur-2xl" />
          <div className="absolute right-[6%] top-[-12%] h-[130%] w-40 -rotate-[18deg] animate-float-slow bg-gradient-to-b from-accent/25 via-transparent to-transparent blur-2xl" />
          {/* stadium crowd light rows */}
          {stadiumLights()}
          {/* LED display band */}
          <div className="absolute inset-x-[16%] top-[30%] h-6 overflow-hidden rounded-md border border-emerald/20 bg-emerald/5">
            <div className="flex h-full w-max animate-marquee items-center gap-6 px-3 text-[9px] font-bold uppercase tracking-widest text-emerald/60">
              {'⚽ GOAL! · LIVE · HALF-TIME · CORNER · MATCH DAY · '.repeat(4).split('·').map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
          </div>
          {/* pitch ellipse */}
          <div className="absolute inset-x-[10%] bottom-[8%] h-40 rounded-[50%] border-2 border-emerald/20" />
        </>
      );
    case 'racing':
      return (
        <>
          <Orb className="left-[10%] top-[16%] h-80 w-80 animate-float-slow bg-warning/20" />
          <Orb className="right-[10%] bottom-[12%] h-80 w-80 animate-float bg-pink/18" />
          {/* motion-blur speed lines */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-1.5 animate-float rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
              style={{ top: `${18 + i * 9}%`, left: '-20%', width: '60%', animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </>
      );
    case 'arcade':
      return (
        <>
          <Orb className="left-[10%] top-[14%] h-80 w-80 animate-float-slow bg-accent/20" />
          <Orb className="right-[12%] top-[10%] h-72 w-72 animate-float bg-pink/20" />
          <Orb className="left-1/3 bottom-[8%] h-96 w-96 animate-float-slow bg-violet/15" />
          {/* holographic shelf lines */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-[8%] h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
              style={{ top: `${28 + i * 14}%` }}
            />
          ))}
          {cube('left-[20%] top-[22%] border-accent/45', 0.4)}
          {card('right-[22%] top-[30%] border-pink/45', 1.1)}
        </>
      );
    case 'esports':
      return (
        <>
          <Orb className="left-1/2 top-[4%] h-[24rem] w-[24rem] -translate-x-1/2 animate-glow-pulse bg-violet/20" />
          {/* stage spotlights */}
          <div className="absolute left-[20%] top-[-10%] h-[130%] w-40 rotate-12 bg-gradient-to-b from-gold/25 via-transparent to-transparent blur-2xl animate-float" />
          <div className="absolute right-[20%] top-[-10%] h-[130%] w-40 -rotate-12 bg-gradient-to-b from-accent/25 via-transparent to-transparent blur-2xl animate-float-slow" />
          {/* confetti */}
          {confetti()}
        </>
      );
    default:
      return null;
  }
}

/* ---- small primitives ---------------------------------------------------- */
function chip(pos: string, color: string, delay: number) {
  return (
    <span
      className={cn('absolute h-14 w-14 animate-float rounded-full border-[6px]', color, pos)}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
function cube(cls: string, delay: number) {
  return (
    <span
      className={cn('absolute h-12 w-12 animate-float-slow rounded-xl border-2', cls)}
      style={{ animationDelay: `${delay}s`, transform: 'rotate(12deg)' }}
    />
  );
}
function card(cls: string, delay: number) {
  return (
    <span
      className={cn('absolute h-16 w-11 animate-float rounded-lg border-2 bg-white/40', cls)}
      style={{ animationDelay: `${delay}s`, transform: 'rotate(-10deg)' }}
    />
  );
}
function rocket(pos: string, delay: number) {
  return (
    <div
      className={cn('absolute bottom-[-8%] h-32 w-8 animate-float', pos)}
      style={{ animationDelay: `${delay}s`, animationDuration: '9s' }}
    >
      <div className="mx-auto h-16 w-3 rounded-full bg-gradient-to-b from-pink/60 to-accent/40" />
      <div className="mx-auto h-16 w-1.5 bg-gradient-to-b from-warning/50 to-transparent blur-[2px]" />
    </div>
  );
}
function sparks(colorClass: string) {
  return (
    <>
      {['left-[20%] top-[30%]', 'left-[60%] top-[24%]', 'left-[40%] top-[52%]', 'left-[75%] top-[46%]'].map((p, i) => (
        <span key={i} className={cn('absolute h-2 w-2 animate-glow-pulse rounded-full', colorClass, p)} />
      ))}
    </>
  );
}
function stadiumLights() {
  return (
    <div className="absolute inset-x-0 top-[12%] flex justify-around">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 animate-glow-pulse rounded-full bg-warning/60"
          style={{ animationDelay: `${(i % 5) * 0.3}s` }}
        />
      ))}
    </div>
  );
}
function confetti() {
  const cols = ['bg-gold/70', 'bg-pink/70', 'bg-accent/70', 'bg-primary/70', 'bg-emerald/70'];
  return (
    <>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className={cn('absolute h-2.5 w-1.5 animate-float rounded-sm', cols[i % cols.length])}
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 60}%`, animationDelay: `${(i % 6) * 0.4}s`, transform: `rotate(${i * 40}deg)` }}
        />
      ))}
    </>
  );
}
