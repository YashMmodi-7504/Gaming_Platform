'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, cn } from '@gaming-platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Medal, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { AnimatedNumber } from '@/components/marketing/animated-number';
import { BracketViewer } from '@/components/tournament/bracket-viewer';
import { ParticipantCard } from '@/components/tournament/participant-card';
import { PrizePodium } from '@/components/tournament/prize-card';
import { TournamentTimeline } from '@/components/tournament/tournament-timeline';
import { ViewerCounter } from '@/components/tournament/viewer-counter';
import { tournamentApi } from '@/lib/tournament-api';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['tournament', id], queryFn: () => tournamentApi.detail(id) });

  const names = useMemo(() => {
    const map = new Map<string, string>();
    detail.data?.participants.forEach((p) => map.set(p.id, p.displayName));
    return map;
  }, [detail.data]);

  const register = useMutation({
    mutationFn: () => tournamentApi.register(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Registered!');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Registration failed'),
  });

  if (detail.isLoading || !detail.data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const t = detail.data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/tournaments">
          <ChevronLeft className="h-4 w-4" /> All tournaments
        </Link>
      </Button>

      {/* Hero */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-violet/20 to-accent/20" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="sheen absolute inset-0" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl glass-strong text-gold shadow-glow-gold animate-float">
              <Trophy className="h-7 w-7" />
            </span>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={t.status === 'live' ? 'live' : t.status === 'registration' ? 'featured' : 'gold'}>
                  {t.status}
                </Badge>
                <span className="text-xs capitalize text-muted-foreground">
                  {t.format.replace(/-/g, ' ')} · {t.cadence}
                </span>
              </div>
              <h1 className="font-display text-3xl font-extrabold text-gradient">{t.name}</h1>
              {t.description ? (
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t.description}</p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prize Pool</p>
            <p className="font-mono text-4xl font-extrabold tabular-nums text-gradient-gold text-glow">
              {t.prizePool}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground sm:justify-end">
              <Users className="h-4 w-4 text-accent" />
              <span className="font-mono tabular-nums">
                <AnimatedNumber value={t.registered} />/{t.capacity}
              </span>
              players
            </p>
            {t.status === 'live' ? (
              <div className="mt-2 flex sm:justify-end">
                <ViewerCounter seed={id} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={t.status} />
        <Stat label="Prize pool" value={t.prizePool} />
        <Stat label="Players" value={`${t.registered}/${t.capacity}`} />
        <Stat label="Entry" value={Number(t.entryFee) > 0 ? t.entryFee : 'Free'} />
      </div>

      {t.status === 'registration' ? (
        <Button
          variant="gradient"
          size="lg"
          className="shadow-glow animate-glow-pulse"
          disabled={register.isPending}
          onClick={() => register.mutate()}
        >
          {register.isPending ? <Spinner size={16} /> : 'Register'}
        </Button>
      ) : null}

      {/* Competition progress + prize distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="font-display text-gradient">Tournament progress</CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentTimeline status={t.status} rounds={t.bracket?.rounds ?? 4} />
          </CardContent>
        </Card>
        {t.awards.length > 0 ? (
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="font-display text-gradient">Prize distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <PrizePodium awards={t.awards} nameOf={(pid) => names.get(pid) ?? pid.slice(0, 6)} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {t.bracket ? (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="font-display text-gradient">Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <BracketViewer matches={t.bracket.matches} names={names} />
          </CardContent>
        </Card>
      ) : null}

      {t.standings.length > 0 ? (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="font-display text-gradient">Standings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {t.standings.slice(0, 20).map((s) => {
              const award = t.awards.find((a) => a.participantId === s.participantId);
              const m = medal(s.rank);
              return (
                <div
                  key={s.participantId}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                    m ? 'glass ' + m.row : 'hover:bg-black/5',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums',
                        m ? m.badge : 'bg-muted/40 text-muted-foreground',
                      )}
                    >
                      {m ? <Medal className="h-4 w-4" /> : s.rank}
                    </span>
                    <span className={cn('font-medium', m && 'text-foreground')}>{s.displayName}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      <AnimatedNumber value={s.score} /> pts
                    </span>
                    {award ? <Badge variant="gold">{award.amount}</Badge> : null}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="font-display text-gradient">Participants</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.participants.map((p, i) => (
              <ParticipantCard key={p.id} id={p.id} name={p.displayName} seed={p.seed} index={i} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** gold / silver / bronze styling for the top-3 ranks, within the token palette. */
function medal(rank: number): { row: string; badge: string } | null {
  if (rank === 1) return { row: 'border-gold/40 shadow-glow-gold', badge: 'bg-gold text-background shadow-glow-gold' };
  if (rank === 2) return { row: 'border-foreground/20', badge: 'bg-foreground/80 text-background shadow-glow-sm' };
  if (rank === 3) return { row: 'border-warning/40', badge: 'bg-warning text-background' };
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="card-premium">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold capitalize text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
