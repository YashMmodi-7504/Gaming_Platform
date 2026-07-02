'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Gauge, Users } from 'lucide-react';
import Link from 'next/link';

import { CountdownCard } from '@/components/events/countdown-card';
import { eventIcon } from '@/components/events/event-icon';
import { EventReward } from '@/components/events/event-reward';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import type { PlatformEvent } from '@/lib/events';

/** Reusable featured-event hero banner. */
export function EventHero({ event }: { event: PlatformEvent }) {
  const Icon = eventIcon(event.icon);
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="card-premium relative overflow-hidden rounded-3xl"
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', event.gradient)} />
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/20 blur-3xl animate-glow-pulse" />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="featured">★ Featured event</Badge>
            <Badge variant="live">● Live now</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl glass-strong text-foreground shadow-glow animate-float">
              <Icon className="h-7 w-7" />
            </span>
            <h1 className="font-display text-3xl font-extrabold text-glow sm:text-4xl">{event.name}</h1>
          </div>
          <p className="text-sm text-foreground/80">{event.desc}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <EventReward reward={event.reward} />
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-accent">
              <Gauge className="h-3.5 w-3.5" /> {event.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-emerald">
              <Users className="h-3.5 w-3.5" /> <AnimatedNumber value={event.players} /> playing
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <CountdownCard seconds={event.seconds} tone="text-primary" />
          <Link
            href={event.href}
            className="rounded-xl bg-gradient-to-r from-primary via-violet to-pink px-6 py-2.5 font-display font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Join now
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
