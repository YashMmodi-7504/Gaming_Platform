'use client';

import { Button } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Compass, Gamepad2, Play, Radio } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { AnimatedNumber } from './animated-number';

// WebGL universe is heavy + browser-only: load it lazily, client-only, with a
// pure-CSS gradient already painted underneath so first paint is instant.
const GamingUniverse = dynamic(() => import('@/components/hero/gaming-universe'), {
  ssr: false,
  loading: () => null,
});

const COUNTERS = [
  { label: 'Players online', value: 18420, live: true },
  { label: 'Games running', value: 1294 },
  { label: 'Current jackpot', value: 2841960, prefix: '$' },
  { label: "Today's winners", value: 7630 },
  { label: 'Live tournaments', value: 42 },
];

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[90vh] flex-col items-center justify-center overflow-hidden">
      {/* vivid animated cinematic backdrop */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(125deg,#4c1d95_0%,#6d28d9_22%,#2563eb_45%,#0891b2_68%,#db2777_100%)] bg-[length:300%_300%] animate-gradient-shift" />
      <div className="absolute inset-0 -z-20 bg-grid opacity-20" />
      {/* WebGL gaming universe */}
      <div className="absolute inset-0 -z-10">
        <GamingUniverse />
      </div>
      {/* readability + fade into the light page below */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(20,12,50,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-b from-transparent to-background" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center">
        {/* floating logo */}
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="mb-7"
        >
          <span className="relative flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-white/15 text-white shadow-[0_0_40px_rgba(255,255,255,0.35)] ring-1 ring-white/30 backdrop-blur">
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink/60 to-accent/60 opacity-70 blur-md" />
            <Gamepad2 className="relative h-8 w-8" />
          </span>
        </motion.div>

        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur"
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
          className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.35)] sm:text-6xl md:text-[4.5rem]"
        >
          Experience the{' '}
          <span className="bg-gradient-to-r from-[#fde68a] via-[#f0abfc] to-[#67e8f9] bg-clip-text text-transparent">
            Future
          </span>
          <br className="hidden sm:block" /> of Online Gaming
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 max-w-xl text-base text-white/85 sm:text-lg"
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
          <Button
            asChild
            size="xl"
            className="w-full border border-white/30 bg-white/10 text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:w-auto"
          >
            <Link href="/games">
              <Compass className="h-5 w-5" /> Explore Games
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            className="w-full border border-white/20 bg-transparent text-white/90 backdrop-blur hover:bg-white/10 sm:w-auto"
          >
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
            <div
              key={c.label}
              className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur"
            >
              <div className="font-display text-xl font-bold text-white sm:text-2xl">
                <AnimatedNumber value={c.value} prefix={c.prefix} live={c.live} />
              </div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/70">
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
        className="absolute bottom-5 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/40 p-1">
          <div className="h-2 w-1 rounded-full bg-white/70" />
        </div>
      </motion.div>
    </section>
  );
}
