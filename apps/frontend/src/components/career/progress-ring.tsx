'use client';

import { cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { useId } from 'react';

/**
 * Reusable animated SVG progress ring. Deterministic; the sweep animates once
 * on view. GPU-friendly (stroke-dashoffset only).
 */
export function ProgressRing({
  pct,
  size = 76,
  stroke = 7,
  children,
  className,
  from = 'hsl(var(--primary))',
  via = 'hsl(var(--violet))',
  to = 'hsl(var(--pink))',
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
}) {
  const gradId = useId();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/5" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (circ * clamped) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="50%" stopColor={via} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
