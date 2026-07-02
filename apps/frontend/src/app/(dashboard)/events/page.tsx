'use client';

import { Badge, Rail } from '@gaming-platform/ui';
import { CalendarClock, CheckCircle2, Flame, PartyPopper, Sparkles, Target } from 'lucide-react';

import { CommunityGoal } from '@/components/events/community-goal';
import { EventCard } from '@/components/events/event-card';
import { EventHero } from '@/components/events/event-hero';
import { EventTimeline } from '@/components/events/event-timeline';
import { SeasonProgress } from '@/components/events/season-progress';
import { communityGoals, eventsByStatus, featuredEvent, platformEvents } from '@/lib/events';

export default function EventsPage() {
  const featured = featuredEvent();
  const live = eventsByStatus('live');
  const upcoming = eventsByStatus('upcoming');
  const finished = eventsByStatus('finished');
  const goals = communityGoals();
  const all = platformEvents();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink via-violet to-primary text-white shadow-glow">
            <PartyPopper className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient">Event Center</h1>
            <p className="text-sm text-muted-foreground">
              Live events, seasonal milestones and community goals — always something happening.
            </p>
          </div>
        </div>
        <Badge variant="live" className="w-fit">
          <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          {live.length} live now
        </Badge>
      </div>

      {/* Featured */}
      <EventHero event={featured} />

      {/* Live events */}
      {live.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
            <Flame className="h-5 w-5 text-destructive" /> Live now
          </h2>
          <Rail label="Live events">
            {live.map((e, i) => (
              <div key={e.id} className="w-72 shrink-0 snap-start">
                <EventCard event={e} index={i} />
              </div>
            ))}
          </Rail>
        </section>
      ) : null}

      {/* Upcoming events */}
      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
            <CalendarClock className="h-5 w-5 text-accent" /> Upcoming
          </h2>
          <Rail label="Upcoming events">
            {upcoming.map((e, i) => (
              <div key={e.id} className="w-72 shrink-0 snap-start">
                <EventCard event={e} index={i} />
              </div>
            ))}
          </Rail>
        </section>
      ) : null}

      {/* Season */}
      <SeasonProgress />

      {/* Community goals + schedule */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
            <Target className="h-5 w-5 text-emerald" /> Community goals
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((g) => (
              <CommunityGoal key={g.id} goal={g} />
            ))}
          </div>
        </section>
        <section className="card-premium space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Sparkles className="h-5 w-5 text-violet" /> Event schedule
          </h2>
          <EventTimeline events={all} />
        </section>
      </div>

      {/* Recently finished */}
      {finished.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" /> Recently finished
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
