'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  /** Count-up duration in ms. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** When set, the number drifts up by small random amounts to feel "live". */
  live?: boolean;
  className?: string;
}

/**
 * Lightweight count-up number with an optional "live" drift. Animates only
 * once on mount (via rAF), then optionally ticks upward — cheap and respects
 * reduced-motion by snapping to the final value.
 */
export function AnimatedNumber({
  value,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  live = false,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const startedRef = useRef(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let startTs = 0;
    const from = startedRef.current ? value : 0;
    startedRef.current = true;

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  useEffect(() => {
    if (!live) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => {
      setDisplay((d) => d + Math.random() * Math.max(1, value * 0.0004));
    }, 2200);
    return () => clearInterval(id);
  }, [live, value]);

  return (
    <span className={className}>
      {prefix}
      {/* Pin the locale so SSR (Node) and the client agree regardless of the
          browser's locale (e.g. en-IN lakh grouping) — avoids hydration drift. */}
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
