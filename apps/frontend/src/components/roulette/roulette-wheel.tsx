'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import type { RouletteColor, RouletteWheelLayout } from '@/lib/roulette-api';

function colorOf(layout: RouletteWheelLayout, n: number): RouletteColor {
  if (layout.greenPockets.includes(n)) return 'green';
  return layout.redNumbers.includes(n) ? 'red' : 'black';
}

const FILL: Record<RouletteColor, string> = {
  red: '#e11d48',
  black: '#1e293b',
  green: '#10b981',
};

interface RouletteWheelProps {
  layout: RouletteWheelLayout;
  /** Total rotation (degrees) to animate to when a result arrives. */
  rotation: number;
  spinning: boolean;
  size?: number;
}

/**
 * Animated roulette wheel rendered from the variant's pocket sequence. The wheel
 * disc rotates to the deterministic landing angle; the ball counter-rotates into
 * the winning pocket. Pure SVG — no per-variant assets required.
 */
export function RouletteWheel({ layout, rotation, spinning, size = 280 }: RouletteWheelProps) {
  const total = layout.sequence.length;
  const radius = size / 2;
  const inner = radius - 26;

  const slices = useMemo(() => {
    const step = 360 / total;
    return layout.sequence.map((number, i) => {
      const start = (i * step - 90) * (Math.PI / 180);
      const end = ((i + 1) * step - 90) * (Math.PI / 180);
      const x1 = radius + inner * Math.cos(start);
      const y1 = radius + inner * Math.sin(start);
      const x2 = radius + inner * Math.cos(end);
      const y2 = radius + inner * Math.sin(end);
      const mid = (i * step + step / 2 - 90) * (Math.PI / 180);
      const tx = radius + (inner - 14) * Math.cos(mid);
      const ty = radius + (inner - 14) * Math.sin(mid);
      return {
        number,
        color: colorOf(layout, number),
        path: `M ${radius} ${radius} L ${x1} ${y1} A ${inner} ${inner} 0 0 1 ${x2} ${y2} Z`,
        tx,
        ty,
        rot: i * step + step / 2,
      };
    });
  }, [layout, total, radius, inner]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '14px solid #fbbf24' }}
      />
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        animate={{ rotate: rotation }}
        transition={{ duration: spinning ? 4 : 0, ease: [0.17, 0.67, 0.32, 0.99] }}
        style={{ originX: '50%', originY: '50%' }}
      >
        <circle cx={radius} cy={radius} r={radius - 1} fill="url(#rim)" stroke="#d4af37" strokeWidth={3} />
        {slices.map((s, i) => (
          <g key={`${s.number}-${i}`}>
            <path d={s.path} fill={FILL[s.color]} stroke="#f5e6c8" strokeWidth={0.6} />
            <text
              x={s.tx}
              y={s.ty}
              fill="#fff"
              fontSize={total > 37 ? 8 : 9}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${s.rot}, ${s.tx}, ${s.ty})`}
            >
              {s.number === 37 ? '00' : s.number}
            </text>
          </g>
        ))}
        <circle cx={radius} cy={radius} r={inner - 30} fill="url(#hub)" stroke="#d4af37" strokeWidth={2} />
        <circle cx={radius} cy={radius} r={(inner - 30) / 2.6} fill="#ffffff" opacity={0.85} />
        <defs>
          <radialGradient id="hub">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d4af37" />
          </radialGradient>
          <radialGradient id="rim">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="100%" stopColor="#f5e6c8" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
