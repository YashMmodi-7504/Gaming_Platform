'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@gaming-platform/ui';
import { Award, Gamepad2, Layers, Medal, Sparkles, Star } from 'lucide-react';

import { AchievementProgress } from '@/components/career/achievement-progress';
import { CareerHero } from '@/components/career/career-hero';
import { CollectionProgress } from '@/components/career/collection-progress';
import { JourneyTimeline } from '@/components/career/journey-timeline';
import { MilestoneCard } from '@/components/career/milestone-card';
import { RecordCard } from '@/components/career/record-card';
import { RecentMatches } from '@/components/presence/recent-match';
import { careerJourney, personalRecords } from '@/lib/career';
import { recentMatches } from '@/lib/player-presence';
import { usePlayerProfile } from '@/stores/player-profile';

function whenAgo(daysAgo: number): string {
  if (daysAgo < 30) return `${daysAgo}d ago`;
  return `${Math.round(daysAgo / 30)}mo ago`;
}

export default function CareerPage() {
  const playerId = usePlayerProfile((s) => s.playerId);
  const records = personalRecords();
  const recentMilestones = [...careerJourney()].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet to-pink text-white shadow-glow">
          <Award className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient">Career</h1>
          <p className="text-sm text-muted-foreground">
            Your lifetime progression — records, journey, achievements and collection.
          </p>
        </div>
      </div>

      {/* Career hero */}
      <CareerHero />

      {/* Recent milestones */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
          <Sparkles className="h-5 w-5 text-gold" /> Recent milestones
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {recentMilestones.map((m, i) => (
            <MilestoneCard
              key={m.id}
              icon={m.icon}
              label={m.label}
              detail={m.detail}
              tone={m.tone}
              when={whenAgo(m.daysAgo)}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Personal records */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl">
          <Star className="h-5 w-5 text-gold" /> Personal records
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r, i) => (
            <RecordCard key={r.id} record={r} index={i} />
          ))}
        </div>
      </section>

      {/* Achievement + collection progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Medal className="h-5 w-5 text-gold" /> Achievement progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementProgress />
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Layers className="h-5 w-5 text-accent" /> Collection progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionProgress />
          </CardContent>
        </Card>
      </div>

      {/* Journey + recent matches */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-premium lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Sparkles className="h-5 w-5 text-violet" /> Your journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyTimeline />
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Gamepad2 className="h-5 w-5 text-accent" /> Recent matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMatches matches={recentMatches(playerId, 6)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
