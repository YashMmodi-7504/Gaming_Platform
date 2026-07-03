'use client';

import { Badge, cn } from '@gaming-platform/ui';
import { motion } from 'framer-motion';
import { Gauge, Users } from 'lucide-react';
import Link from 'next/link';

import { CountdownCard } from '@/components/events/countdown-card';
import { eventIcon } from '@/components/events/event-icon';
import { EventReward } from '@/components/events/event-reward';
import type { EventStatus, PlatformEvent } from '@/lib/events';

const STATUS_BADGE: Record<EventStatus, { variant: 'featured' | 'live' | 'neon' | 'outline'; label: string }> = {
  featured: { variant: 'featured', label: 'Featured' },
  live: { variant: 'live', label: '● Live' },
  upcoming: { variant: 'neon', label: 'Upcoming' },
  finished: { variant: 'outline', label: 'Finished' },
};

/** Reusable event card: artwork, status, participation, players, reward, countdown. */
export function EventCard({ event, index = 0 }: { event: PlatformEvent; index?: number }) {
  const Icon = eventIcon(event.icon);
  const badge = STATUS_BADGE[event.status];
  const finished = event.status === 'finished';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -4 }}
      className={cn('card-premium group overflow-hidden p-0', finished && 'opacity-80')}
    >
      {/* artwork */}
      <div className={cn('relative h-28 overflow-hidden bg-gradient-to-br', event.gradient)}>
        <div className="bg-grid absolute inset-0 opacity-15" />
        <div className="absolute -inset-x-10 -top-10 h-24 rotate-12 bg-white/20 blur-2xl transition-opacity duration-500 group-hover:opacity-90" />
        <Icon className="absolute -bottom-2 left-4 h-16 w-16 text-white/90 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
        <Badge variant={badge.variant} className="absolute right-3 top-3">
          {badge.label}
        </Badge>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="font-display text-base font-bold">{event.name}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{event.desc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 font-semibold text-accent">
            <Gauge className="h-3 w-3" /> {event.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 font-semibold text-emerald">
            <Users className="h-3 w-3" /> <span className="tabular-nums">{event.players.toLocaleString('en-US')}</span>
          </span>
        </div>

        {/* participation / progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{finished ? 'Completed' : 'Participation'}</span>
            <span className="font-mono tabular-nums">{finished ? 100 : event.participation}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${finished ? 100 : event.participation}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={cn('h-full rounded-full bg-gradient-to-r shadow-glow-sm', event.gradient)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <EventReward reward={event.reward} />
          {finished ? (
            <span className="text-[11px] text-muted-foreground">Ended {event.endedAgo}</span>
          ) : (
            <CountdownCard seconds={event.seconds} label={event.status === 'upcoming' ? 'Starts in' : 'Ends in'} />
          )}
        </div>

        <Link
          href={event.href}
          className={cn(
            'block w-full rounded-lg py-2 text-center text-sm font-semibold transition-all',
            finished
              ? 'bg-black/5 text-muted-foreground'
              : 'bg-gradient-to-r from-primary via-violet to-pink text-white shadow-glow-sm hover:-translate-y-0.5 hover:shadow-glow',
          )}
        >
          {finished ? 'View results' : event.status === 'upcoming' ? 'Set reminder' : 'Join event'}
        </Link>
      </div>
    </motion.div>
  );
}
