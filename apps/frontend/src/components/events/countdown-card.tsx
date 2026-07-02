'use client';

import { cn } from '@gaming-platform/ui';
import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

function format(total: number): string {
  const t = Math.max(0, total);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Reusable live countdown. The seeded `seconds` is rendered identically on
 * server and first client paint (no hydration drift); it then ticks down
 * client-side, suppressed under reduced motion.
 */
export function CountdownCard({
  seconds,
  label = 'Ends in',
  className,
  tone = 'text-primary',
}: {
  seconds: number;
  label?: string;
  className?: string;
  tone?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion');
    if (reduced) return;
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl bg-black/[0.04] px-3 py-1.5 ring-1 ring-inset ring-black/5',
        className,
      )}
    >
      <Timer className={cn('h-4 w-4', tone)} aria-hidden />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-sm font-bold tabular-nums', tone)}>{format(remaining)}</span>
    </div>
  );
}
