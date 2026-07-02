'use client';

import { cn } from '@gaming-platform/ui';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useId } from 'react';

/**
 * Reusable deterministic price sparkline (oldest → newest) with a signed
 * movement badge. Pure SVG — GPU-friendly, no dependencies.
 */
export function PriceHistory({
  series,
  movementPct,
  className,
  height = 40,
}: {
  series: number[];
  movementPct?: number;
  className?: string;
  height?: number;
}) {
  const gradId = useId();
  if (series.length < 2) return null;

  const w = 100;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const coords = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const pct = movementPct ?? Number((((last - first) / first) * 100).toFixed(1));
  const up = pct >= 0;
  const stroke = up ? 'hsl(var(--emerald))' : 'hsl(var(--destructive))';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="h-10 flex-1"
        role="img"
        aria-label={`Price trend ${up ? 'up' : 'down'} ${Math.abs(pct)}%`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${coords.join(' ')} ${w},${height}`} fill={`url(#${gradId})`} />
        <polyline points={coords.join(' ')} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
          up ? 'bg-emerald/10 text-emerald' : 'bg-destructive/10 text-destructive',
        )}
      >
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(pct)}%
      </span>
    </div>
  );
}
