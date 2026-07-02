'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Gamepad2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { clientConfig } from '@/lib/config';

/**
 * Cinematic startup sequence — an animated logo boot + particle fly-through
 * shown ONCE per browser session before the Gaming Universe is revealed. Skips
 * instantly under prefers-reduced-motion, and can be skipped by the player.
 * Overlay only; never blocks interaction once dismissed.
 */
const KEY = 'gp-intro-seen';
const DURATION = 3400;

const PARTICLES = Array.from({ length: 22 }, (_, i) => i);

export function CinematicIntro() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen || reduce) return;

    setShow(true);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = window.setTimeout(dismiss, DURATION);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* cinematic backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#3b1e8f_0%,#1e40af_45%,#0891b2_100%)] bg-[length:200%_200%] animate-gradient-shift" />
          <div className="bg-grid absolute inset-0 opacity-20" />
          {/* fly-through particles */}
          {PARTICLES.map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.2, 1, 2.4],
                x: (((i * 71) % 100) - 50) * 8,
                y: (((i * 37) % 100) - 50) * 6,
              }}
              transition={{ duration: 2.4, delay: (i % 8) * 0.12, repeat: Infinity, ease: 'easeOut' }}
              className="absolute h-1.5 w-1.5 rounded-full bg-white/80"
            />
          ))}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

          {/* logo assemble */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.2 }}
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 text-white shadow-[0_0_60px_rgba(255,255,255,0.5)] ring-1 ring-white/40 backdrop-blur"
          >
            <span className="absolute inset-0 animate-glow-pulse rounded-3xl bg-gradient-to-br from-pink/60 to-accent/60 opacity-70 blur-md" />
            <Gamepad2 className="relative h-12 w-12" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="relative z-10 mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            {clientConfig.appName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="relative z-10 mt-2 flex items-center gap-2 text-sm font-medium text-white/80"
          >
            <Sparkles className="h-4 w-4" /> Entering the Gaming Universe…
          </motion.p>

          {/* boot progress */}
          <div className="relative z-10 mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white via-[#fde68a] to-[#67e8f9] transition-[width] duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <button
            onClick={dismiss}
            className="absolute bottom-8 right-8 z-10 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            Skip intro →
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
