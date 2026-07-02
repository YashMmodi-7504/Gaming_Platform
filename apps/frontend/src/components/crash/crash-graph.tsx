'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export type CrashGraphStatus = 'idle' | 'running' | 'cashed' | 'crashed';

interface CrashGraphProps {
  /** Sampled multiplier values over the round, oldest → newest. */
  samples: number[];
  multiplier: number;
  status: CrashGraphStatus;
  height?: number;
}

// Vibrant on-light curve colors per round state.
const STATUS_COLOR: Record<CrashGraphStatus, string> = {
  idle: 'hsl(263 85% 60%)',
  running: 'hsl(263 85% 60%)',
  cashed: 'hsl(152 64% 42%)',
  crashed: 'hsl(350 84% 56%)',
};

/**
 * Animated multiplier graph. Plots the live rising curve as an SVG path; the
 * vertical scale auto-expands as the multiplier grows. Pure SVG — responsive and
 * accessible (the live multiplier is announced via aria-live by the parent).
 */
export function CrashGraph({ samples, multiplier, status, height = 280 }: CrashGraphProps) {
  const color = STATUS_COLOR[status];
  const width = 600;

  const { path, area } = useMemo(() => {
    if (samples.length < 2) return { path: '', area: '' };
    const peak = Math.max(2, ...samples);
    const n = samples.length;
    const x = (i: number) => (i / (n - 1)) * width;
    const y = (m: number) => height - ((m - 1) / (peak - 1)) * (height - 10) - 5;
    let d = `M ${x(0)} ${y(samples[0]!)}`;
    for (let i = 1; i < n; i += 1) d += ` L ${x(i)} ${y(samples[i]!)}`;
    const areaPath = `${d} L ${x(n - 1)} ${height} L ${x(0)} ${height} Z`;
    return { path: d, area: areaPath };
  }, [samples, height]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-white to-primary/5 shadow-glow-sm">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[260px] w-full sm:h-[300px]"
        role="img"
        aria-label={`Multiplier ${multiplier.toFixed(2)}x`}
      >
        <defs>
          <linearGradient id="crashStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(263 85% 60%)" />
            <stop offset="100%" stopColor="hsl(326 82% 60%)" />
          </linearGradient>
          <linearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id="crashGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="hsl(326 82% 60%)" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Faint grid lines for depth — purely decorative. */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={0}
            y1={height * g}
            x2={width}
            y2={height * g}
            stroke="hsl(230 40% 30% / 0.06)"
            strokeWidth={1}
          />
        ))}

        {area ? <path d={area} fill="url(#crashFill)" /> : null}
        {path ? (
          <path
            d={path}
            fill="none"
            stroke={status === 'running' || status === 'idle' ? 'url(#crashStroke)' : color}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#crashGlow)"
          />
        ) : null}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn('font-display text-5xl font-black tabular-nums drop-shadow-[0_2px_18px_rgba(168,85,247,0.35)] sm:text-7xl')}
          style={{ color }}
          aria-live="polite"
        >
          {multiplier.toFixed(2)}×
        </span>
        {status === 'crashed' ? (
          <span className="mt-1 text-sm font-semibold uppercase tracking-widest text-destructive">
            Crashed
          </span>
        ) : null}
        {status === 'cashed' ? (
          <span className="mt-1 text-sm font-semibold uppercase tracking-widest text-emerald">
            Cashed Out
          </span>
        ) : null}
      </div>
    </div>
  );
}
