'use client';

import { Button, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Compass, Gamepad2, Play, Radio } from 'lucide-react';
import Link from 'next/link';

import { AnimatedNumber } from './animated-number';

const COUNTERS = [
  { label: 'Players online', value: 18420, live: true },
  { label: 'Games running', value: 1294 },
  { label: 'Current jackpot', value: 2841960, prefix: '$' },
  { label: "Today's winners", value: 7630 },
  { label: 'Live tournaments', value: 42 },
];

/**
 * Home hero (PPP-13) — a calm, premium light hero on the soft pastel-blue page
 * background. Keeps the layout, counters and entrance/count-up animations; the
 * old animated purple WebGL universe + particles + beams are gone.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[86vh] flex-col items-center justify-center overflow-hidden">
      {/* One soft, static light glow so the hero has gentle depth on the pastel wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -8%, hsl(210 70% 96%) 0%, hsl(210 45% 98%) 40%, transparent 72%)',
        }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center">
        {/* logo */}
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="mb-7"
        >
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet to-pink text-white shadow-glow ring-1 ring-white/40">
            <Gamepad2 className="relative h-8 w-8" />
          </span>
        </motion.div>

        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/70 px-4 py-1.5 text-xs font-semibold text-foreground shadow-soft backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
          </span>
          The universe is live — enter and play
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-[4.5rem]"
        >
          Experience the <span className="text-gradient">Future</span>
          <br className="hidden sm:block" /> of Online Gaming
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Thousands of games. Live casino. Provably fair. Real-time tournaments. One premium
          platform — and an entire universe to explore.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
        >
          <Button asChild size="xl" variant="gradient" className="sheen w-full sm:w-auto">
            <Link href="/casino">
              <Play className="h-5 w-5 fill-white" /> Start Playing
            </Link>
          </Button>
          <Button asChild size="xl" variant="glass" className="w-full sm:w-auto">
            <Link href="/games">
              <Compass className="h-5 w-5" /> Explore Games
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
            <Link href="/crash">
              <Radio className="h-5 w-5 text-pink" /> Watch Live
            </Link>
          </Button>
        </motion.div>

        {/* animated counters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {COUNTERS.map((c) => (
            <div key={c.label} className="card-premium px-3 py-3">
              <div className="font-display text-xl font-bold text-foreground sm:text-2xl">
                <AnimatedNumber value={c.value} prefix={c.prefix} live={c.live} />
              </div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1, duration: 1.6, repeat: Infinity }}
        className={cn('absolute bottom-5 left-1/2 -translate-x-1/2')}
      >
        <div className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-foreground/25 p-1">
          <div className="h-2 w-1 rounded-full bg-foreground/50" />
        </div>
      </motion.div>
    </section>
  );
}
