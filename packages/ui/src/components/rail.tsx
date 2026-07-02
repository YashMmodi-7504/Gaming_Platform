'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface RailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible label for the horizontal scroll region. */
  label?: string;
  /** Class applied to the inner scroll track (defaults to `flex gap-4`). */
  trackClassName?: string;
}

/**
 * A premium horizontally-scrolling rail: hidden native scrollbar, scroll-snap,
 * hover-revealed chevron controls, and edge-fade masks that appear only when
 * there is content to scroll toward. The chrome (chevrons + fades) is
 * hover-gated so the at-rest rendering matches a plain scroll row — keeping
 * visual snapshots stable — and reveals on hover for a console-grade feel.
 *
 * Children should be `shrink-0` items; add `snap-start` for snap alignment.
 */
export function Rail({ className, trackClassName, label, children, ...props }: RailProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(true);
  const [overflowing, setOverflowing] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflowing(max > 4);
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    const onScroll = () => measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [measure]);

  const nudge = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduced =
      typeof window !== 'undefined' &&
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('reduce-motion'));
    const amount = Math.max(240, el.clientWidth * 0.8) * direction;
    el.scrollBy({ left: amount, behavior: reduced ? 'auto' : 'smooth' });
  };

  const showLeft = overflowing && !atStart;
  const showRight = overflowing && !atEnd;

  return (
    <div className={cn('group/rail relative', className)} {...props}>
      <div
        ref={trackRef}
        role={label ? 'group' : undefined}
        aria-label={label}
        className={cn(
          'flex gap-4 overflow-x-auto scroll-smooth pb-2',
          'snap-x snap-mandatory',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          trackClassName,
        )}
      >
        {children}
      </div>

      {/* Edge-fade masks — hover-revealed, only toward scrollable content. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-14 rounded-l-2xl bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100',
          !showLeft && '!opacity-0',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-14 rounded-r-2xl bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100',
          !showRight && '!opacity-0',
        )}
      />

      {/* Chevron controls — hover-revealed, disabled at the extremes. */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        tabIndex={showLeft ? 0 : -1}
        className={cn(
          'glass absolute left-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground shadow-glow-sm transition-all duration-200 hover:scale-110 hover:text-primary md:flex',
          'opacity-0 group-hover/rail:opacity-100',
          !showLeft && 'pointer-events-none !opacity-0',
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        tabIndex={showRight ? 0 : -1}
        className={cn(
          'glass absolute right-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground shadow-glow-sm transition-all duration-200 hover:scale-110 hover:text-primary md:flex',
          'opacity-0 group-hover/rail:opacity-100',
          !showRight && 'pointer-events-none !opacity-0',
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
