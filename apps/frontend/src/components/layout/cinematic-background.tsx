'use client';

import { useEffect, useState } from 'react';

/**
 * Rotating cinematic background. Four original, GPU-cheap CSS scenes (casino
 * lights, neon city, floating chips/dice, cosmic drift) crossfade every ~9s so
 * the site always feels alive — without videos or heavy WebGL. Fixed behind all
 * content, kept light + subtle so text stays readable. Honors reduced-motion by
 * holding a single static scene.
 */
const SCENE_COUNT = 4;
const INTERVAL = 9000;

export function CinematicBackground() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => setScene((s) => (s + 1) % SCENE_COUNT), INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Each scene crossfades via opacity. */}
      <Scene active={scene === 0}>
        {/* Casino lights — drifting bokeh */}
        <Orb className="left-[8%] top-[14%] h-80 w-80 bg-gold/25 animate-float-slow" />
        <Orb className="right-[10%] top-[8%] h-72 w-72 bg-pink/25 animate-float" />
        <Orb className="left-1/3 bottom-[6%] h-96 w-96 bg-primary/20 animate-float-slow" />
        <Orb className="right-1/4 bottom-[18%] h-64 w-64 bg-accent/20 animate-float" />
      </Scene>

      <Scene active={scene === 1}>
        {/* Neon city — light rays + skyline glow */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-accent/15 to-transparent" />
        <div className="absolute -left-1/4 top-[-30%] h-[140%] w-1/2 rotate-12 bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-2xl animate-float-slow" />
        <div className="absolute right-[-10%] top-[-30%] h-[140%] w-1/3 -rotate-12 bg-gradient-to-b from-pink/12 via-transparent to-transparent blur-2xl animate-float" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-violet/15 to-transparent" />
        <Orb className="left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 bg-accent/15 animate-glow-pulse" />
      </Scene>

      <Scene active={scene === 2}>
        {/* Floating chips & dice */}
        {CHIPS.map((c, i) => (
          <span
            key={i}
            className={`absolute ${c.pos} ${c.size} ${c.anim} ${c.rounded} border-2 ${c.color} opacity-60`}
            style={{ animationDelay: `${c.delay}s` }}
          />
        ))}
        <Orb className="left-1/4 top-1/4 h-80 w-80 bg-emerald/15 animate-float-slow" />
        <Orb className="right-1/4 bottom-1/4 h-80 w-80 bg-gold/20 animate-float" />
      </Scene>

      <Scene active={scene === 3}>
        {/* Cosmic drift — stars + light streak */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        {STARS.map((s, i) => (
          <span
            key={i}
            className={`absolute ${s} h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary/50`}
          />
        ))}
        <div className="absolute left-[-20%] top-1/3 h-1 w-1/2 rotate-[18deg] bg-gradient-to-r from-transparent via-pink/40 to-transparent blur-[2px] animate-float" />
        <Orb className="right-[12%] top-[20%] h-96 w-96 bg-violet/20 animate-float-slow" />
      </Scene>

      {/* Soft top sheen + grid keep things bright and legible. */}
      <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent" />
    </div>
  );
}

function Scene({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-[2200ms] ease-in-out ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-[120px] ${className}`} />;
}

const CHIPS = [
  { pos: 'left-[10%] top-[20%]', size: 'h-16 w-16', anim: 'animate-float', rounded: 'rounded-full', color: 'border-gold/50', delay: 0 },
  { pos: 'right-[14%] top-[16%]', size: 'h-14 w-14', anim: 'animate-float-slow', rounded: 'rounded-xl', color: 'border-primary/50', delay: 1.2 },
  { pos: 'left-[18%] bottom-[20%]', size: 'h-12 w-12', anim: 'animate-float-slow', rounded: 'rounded-full', color: 'border-pink/50', delay: 0.6 },
  { pos: 'right-[22%] bottom-[24%]', size: 'h-16 w-16', anim: 'animate-float', rounded: 'rounded-xl', color: 'border-accent/50', delay: 1.8 },
  { pos: 'left-1/2 top-[12%]', size: 'h-10 w-10', anim: 'animate-float', rounded: 'rounded-full', color: 'border-emerald/50', delay: 0.9 },
];

const STARS = [
  'left-[12%] top-[18%]',
  'left-[30%] top-[40%]',
  'left-[55%] top-[22%]',
  'left-[72%] top-[48%]',
  'left-[85%] top-[28%]',
  'left-[22%] top-[66%]',
  'left-[48%] top-[72%]',
  'left-[68%] top-[64%]',
];
