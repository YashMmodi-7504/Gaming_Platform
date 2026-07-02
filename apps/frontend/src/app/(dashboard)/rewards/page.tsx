'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, cn } from '@gaming-platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Gift, Target } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { tournamentApi } from '@/lib/tournament-api';

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const missions = useQuery({ queryKey: ['my-missions'], queryFn: tournamentApi.myMissions });
  const achievements = useQuery({ queryKey: ['my-achievements'], queryFn: tournamentApi.myAchievements });
  const rewards = useQuery({ queryKey: ['my-rewards'], queryFn: tournamentApi.myRewards });

  const claim = useMutation({
    mutationFn: (claimId: string) => tournamentApi.claimReward(claimId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-rewards'] });
      toast.success('Reward claimed');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Claim failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards & Missions" description="Complete missions, earn XP, unlock achievements and claim rewards." />

      {/* XP / level */}
      {missions.data ? (
        <div className="card-premium relative overflow-hidden p-5 animate-fade-up">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-gold to-warning opacity-20 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-warning font-display text-lg font-bold text-white shadow-glow-gold">
                {missions.data.level}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-gradient-gold">Level {missions.data.level}</p>
                <p className="text-xs text-muted-foreground">Keep playing to rank up</p>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-gold">{missions.data.xp} XP</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold via-warning to-gold shadow-glow-gold"
              style={{
                width: `${missions.data.levelProgress.needed > 0 ? Math.min(100, (missions.data.levelProgress.into / missions.data.levelProgress.needed) * 100) : 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Missions */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white shadow-glow-sm">
                <Target className="h-4 w-4" />
              </span>
              <span className="text-gradient">Missions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missions.isLoading ? (
              <Spinner />
            ) : missions.data && missions.data.missions.length > 0 ? (
              missions.data.missions.map((m) => (
                <div key={m.id} className="glass rounded-xl border border-black/10 p-3 transition-colors hover:bg-black/5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.name}</span>
                    <Badge variant={m.completed ? 'success' : 'secondary'}>{m.window}</Badge>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent shadow-glow-sm" style={{ width: `${m.percent}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums">{m.value}/{m.target}</span> · <span className="text-accent">{m.xp} XP</span>
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No missions active.</p>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-warning text-white shadow-glow-gold">
                <Award className="h-4 w-4" />
              </span>
              <span className="text-gradient-gold">Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {achievements.isLoading ? (
              <Spinner />
            ) : achievements.data && achievements.data.length > 0 ? (
              achievements.data.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 transition-colors',
                    a.unlocked
                      ? 'border-gold/40 bg-gold/5 shadow-glow-gold'
                      : 'border-black/10 bg-white/[0.02] hover:bg-black/5',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono tabular-nums">{a.progress}/{a.target}</span> · <span className="text-gold">{a.points} pts</span>
                    </p>
                  </div>
                  {a.unlocked ? <Badge variant="gold">Unlocked</Badge> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No achievements yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reward claims */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink to-violet text-white shadow-glow">
              <Gift className="h-4 w-4" />
            </span>
            <span className="text-gradient">My rewards</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rewards.isLoading ? (
            <Spinner />
          ) : rewards.data && rewards.data.length > 0 ? (
            rewards.data.map((r) => (
              <div key={r.id} className="glass flex items-center justify-between rounded-xl border border-black/10 p-3 text-sm transition-colors hover:bg-black/5">
                <div>
                  <p className="font-medium">{r.reward.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reward.type}
                    {r.reward.value ? ` · ${r.reward.value}` : ''}
                  </p>
                </div>
                {r.status === 'PENDING' ? (
                  <Button size="sm" variant="gold" disabled={claim.isPending} onClick={() => claim.mutate(r.id)}>
                    Claim
                  </Button>
                ) : (
                  <Badge variant="outline">{r.status}</Badge>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No rewards yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
