'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Global click microinteraction: a soft ripple + a burst of neon sparks at the
 * cursor on every pointer press. One delegated listener, GPU transforms only,
 * auto-cleans, and disabled under prefers-reduced-motion.
 */
interface Burst {
  id: number;
  x: number;
  y: number;
  hue: number;
}

const SPARKS = 6;

export function ClickFx() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let id = 0;
    const onDown = (e: PointerEvent) => {
      id += 1;
      const burst = { id, x: e.clientX, y: e.clientY, hue: (id * 47) % 360 };
      setBursts((b) => [...b, burst].slice(-6));
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== burst.id)), 700);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
        {bursts.map((b) => (
          <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
            {/* ripple */}
            <motion.span
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute -ml-5 -mt-5 h-10 w-10 rounded-full"
              style={{ border: `2px solid hsl(${b.hue} 90% 60%)` }}
            />
            {/* sparks */}
            {Array.from({ length: SPARKS }).map((_, i) => {
              const ang = (i / SPARKS) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(ang) * 26, y: Math.sin(ang) * 26, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: `hsl(${(b.hue + i * 30) % 360} 90% 62%)` }}
                />
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
