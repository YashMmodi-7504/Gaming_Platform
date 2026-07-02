'use client';

import { cn } from '@gaming-platform/ui';
import { Accessibility, Contrast, Minus, Plus, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Accessibility controls: user-toggled reduced motion, high-contrast palette,
 * and font scaling. Preferences persist in localStorage and apply CSS classes /
 * root font-size — no backend, fully client-side.
 */
const SCALES = [14, 15, 16, 18, 20];

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [scaleIdx, setScaleIdx] = useState(2);

  // hydrate from storage
  useEffect(() => {
    try {
      setReduce(localStorage.getItem('a11y-reduce') === '1');
      setContrast(localStorage.getItem('a11y-contrast') === '1');
      const s = Number(localStorage.getItem('a11y-scale'));
      if (Number.isInteger(s) && s >= 0 && s < SCALES.length) setScaleIdx(s);
    } catch {
      /* ignore */
    }
  }, []);

  // apply
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduce);
    try {
      localStorage.setItem('a11y-reduce', reduce ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [reduce]);
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', contrast);
    try {
      localStorage.setItem('a11y-contrast', contrast ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [contrast]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${SCALES[scaleIdx] ?? 16}px`;
    try {
      localStorage.setItem('a11y-scale', String(scaleIdx));
    } catch {
      /* ignore */
    }
  }, [scaleIdx]);

  return (
    <div className="fixed bottom-[4.5rem] right-5 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="glass-strong w-60 rounded-2xl p-4 shadow-elevated">
          <p className="mb-3 font-display text-sm font-bold">Accessibility</p>

          <Toggle icon={Zap} label="Reduce motion" on={reduce} onClick={() => setReduce((v) => !v)} />
          <Toggle icon={Contrast} label="High contrast" on={contrast} onClick={() => setContrast((v) => !v)} />

          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Text size</p>
            <div className="flex items-center gap-2">
              <button
                aria-label="Smaller text"
                onClick={() => setScaleIdx((i) => Math.max(0, i - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.05] hover:bg-primary/10 hover:text-primary"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center font-mono text-sm font-semibold">{SCALES[scaleIdx]}px</div>
              <button
                aria-label="Larger text"
                onClick={() => setScaleIdx((i) => Math.min(SCALES.length - 1, i + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.05] hover:bg-primary/10 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Accessibility options"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-foreground shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-glow-sm"
      >
        <Accessibility className="h-5 w-5" />
      </button>
    </div>
  );
}

function Toggle({ icon: Icon, label, on, onClick }: { icon: typeof Zap; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04]"
    >
      <Icon className={cn('h-4 w-4', on ? 'text-primary' : 'text-muted-foreground')} />
      <span className="flex-1 text-left">{label}</span>
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', on ? 'bg-primary' : 'bg-black/15')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[1.15rem]' : 'left-0.5')} />
      </span>
    </button>
  );
}
