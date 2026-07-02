'use client';

import { Badge, Button, Card, CardContent, Spinner, cn } from '@gaming-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { Clock, Crown, Trophy, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { PageHeader } from '@/components/shared/page-header';
import { ViewerCounter } from '@/components/tournament/viewer-counter';
import { FEATURED_TOURNAMENT, demoTournaments } from '@/lib/demo-tournaments';
import { tournamentApi } from '@/lib/tournament-api';

const STATUS_VARIANT: Record<string, 'live' | 'featured' | 'gold' | 'outline'> = {
  live: 'live',
  registration: 'featured',
  completed: 'outline',
  scheduled: 'gold',
};

const TABS = ['registration', 'live', 'completed'] as const;

export default function TournamentsPage() {
  const [tab, setTab] = useState<string>('registration');
  const tournaments = useQuery({
    queryKey: ['tournaments', tab],
    queryFn: () => tournamentApi.list(tab),
  });

  // Never empty: fall back to deterministic demo tournaments for the tab.
  const list =
    tournaments.data && tournaments.data.length > 0 ? tournaments.data : demoTournaments(tab);
  const featured = tournaments.data?.find((x) => x.status === 'live') ?? FEATURED_TOURNAMENT;
  const featuredPct =
    featured.capacity > 0 ? Math.min(100, Math.round((featured.registered / featured.capacity) * 100)) : 0;

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-60" />

      <PageHeader title="Tournaments" description="Compete for prize pools across every game." />

      {/* Featured tournament hero */}
      <section className="card-premium relative overflow-hidden rounded-3xl border border-gold/20 shadow-elevated">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-violet/15 to-gold/10" />
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl animate-glow-pulse" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold" className="shadow-glow-gold">★ Featured</Badge>
              <Badge variant="live"><span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> Live</Badge>
              <ViewerCounter seed={featured.id} label="spectators" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-gradient-gold text-glow">{featured.name}</span>
            </h1>
            <p className="text-sm capitalize text-muted-foreground">
              {featured.format.replace(/-/g, ' ')} · {featured.cadence} · Entry {Number(featured.entryFee) > 0 ? featured.entryFee : 'Free'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild variant="gradient" size="lg" className="sheen shadow-glow">
                <Link href={`/tournaments/${featured.id}`}>
                  <Zap className="h-4 w-4" /> Enter now
                </Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-mono tabular-nums">
                  <AnimatedNumber value={featured.registered} />/{featured.capacity}
                </span>{' '}
                players
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div className="glass-strong rounded-2xl p-5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prize Pool</p>
              <p className="font-mono text-4xl font-extrabold tabular-nums text-gradient-gold text-glow">{featured.prizePool}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/5">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary shadow-glow-sm" style={{ width: `${featuredPct}%` }} />
            </div>
            <p className="text-center text-xs text-muted-foreground">{featuredPct}% of seats filled</p>
          </div>
        </div>
      </section>

      <div className="flex gap-1 rounded-xl glass p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-all',
              tab === t
                ? 'bg-gradient-to-r from-primary to-violet text-primary-foreground shadow-glow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tournaments.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            const isLive = t.status === 'live';
            const pct = t.capacity > 0 ? Math.min(100, Math.round((t.registered / t.capacity) * 100)) : 0;
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="group">
                <Card className="card-premium relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                  {/* glowing banner */}
                  <div className="relative h-20 overflow-hidden bg-gradient-to-br from-primary via-violet to-accent">
                    <div className="absolute inset-0 bg-grid opacity-30" />
                    <div className="sheen absolute inset-0" />
                    <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl glass-strong text-gold shadow-glow-gold animate-float">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <div className="absolute right-3 top-3">
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>{t.status}</Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <p className="font-display text-lg font-bold text-foreground transition-colors group-hover:text-gradient">
                      {t.name}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {t.format.replace(/-/g, ' ')} · {t.cadence}
                    </p>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prize Pool</p>
                        <p className="font-mono text-2xl font-extrabold tabular-nums text-gradient-gold text-glow">
                          {t.prizePool}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-xs font-medium text-accent">
                        <Clock className="h-3.5 w-3.5" />
                        {isLive ? 'Live now' : 'Open'}
                      </span>
                    </div>

                    {/* capacity bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 text-accent" />
                          <span className="font-mono tabular-nums">
                            <AnimatedNumber value={t.registered} />/{t.capacity}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-primary shadow-glow-sm transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Crown className="h-3.5 w-3.5 text-gold" />
                        Entry {Number(t.entryFee) > 0 ? t.entryFee : 'Free'}
                      </span>
                      <Button
                        variant="gradient"
                        size="sm"
                        className="pointer-events-none shadow-glow-sm"
                        tabIndex={-1}
                        aria-hidden
                      >
                        {t.status === 'registration' ? 'Register' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
