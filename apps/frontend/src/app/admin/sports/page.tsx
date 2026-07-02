'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@gaming-platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { adminSportsApi, sportsApi, type Match } from '@/lib/sports-api';

const MATCH_PLACEHOLDER = `{
  "id": "epl-ars-che-2026",
  "competitionKey": "epl",
  "sportKey": "football",
  "name": "Arsenal vs Chelsea",
  "startTime": "2026-07-01T18:00:00Z",
  "status": "scheduled",
  "participants": [
    { "id": "ars", "name": "Arsenal", "side": "home" },
    { "id": "che", "name": "Chelsea", "side": "away" }
  ],
  "markets": [
    {
      "id": "epl-ars-che-mw",
      "templateKey": "match-winner",
      "name": "Match Winner",
      "settlement": "outright",
      "status": "open",
      "selections": [
        { "id": "ars", "name": "Arsenal", "odds": 2.1, "status": "open" },
        { "id": "draw", "name": "Draw", "odds": 3.4, "status": "open" },
        { "id": "che", "name": "Chelsea", "odds": 3.2, "status": "open" }
      ]
    }
  ]
}`;

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminSportsPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-sports-stats'], queryFn: adminSportsApi.statistics });
  const sports = useQuery({ queryKey: ['admin-sports-sports'], queryFn: adminSportsApi.sports });
  const matches = useQuery({ queryKey: ['admin-sports-matches'], queryFn: () => sportsApi.matches() });

  const [comp, setComp] = useState({ key: '', sportKey: 'football', name: '', region: '', season: '', tournament: '' });
  const [matchJson, setMatchJson] = useState('');
  const [winners, setWinners] = useState<Record<string, string>>({});

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-sports-matches'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-sports-stats'] });
  };

  const createComp = useMutation({
    mutationFn: () =>
      adminSportsApi.upsertCompetition({
        key: comp.key,
        sportKey: comp.sportKey,
        name: comp.name,
        region: comp.region,
        season: comp.season || undefined,
        tournament: comp.tournament || undefined,
      }),
    onSuccess: () => {
      toast.success('Competition saved');
      setComp({ key: '', sportKey: 'football', name: '', region: '', season: '', tournament: '' });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const createMatch = useMutation({
    mutationFn: () => {
      let parsed: Match;
      try {
        parsed = JSON.parse(matchJson) as Match;
      } catch {
        throw new Error('Match must be valid JSON');
      }
      return adminSportsApi.upsertMatch(parsed);
    },
    onSuccess: () => {
      invalidate();
      setMatchJson('');
      toast.success('Match saved');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed to save match'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminSportsApi.setMatchStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Status updated');
    },
  });

  const settle = useMutation({
    mutationFn: ({ id, marketId, selectionId }: { id: string; marketId: string; selectionId: string }) =>
      adminSportsApi.settleMatch(id, { winners: { [marketId]: [selectionId] } }),
    onSuccess: () => {
      invalidate();
      toast.success('Match settled');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Settle failed'),
  });

  const removeMatch = useMutation({
    mutationFn: (id: string) => adminSportsApi.removeMatch(id),
    onSuccess: () => {
      invalidate();
      toast.success('Match deleted');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports Betting"
        description="Manage the data-driven catalog: sports, competitions, matches, markets, odds and settlement."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Sports" value={stats.data?.sports ?? '—'} />
        <StatCard label="Competitions" value={stats.data?.competitions ?? 0} />
        <StatCard label="Matches" value={stats.data?.matches ?? 0} />
        <StatCard label="Live" value={stats.data?.live ?? 0} />
        <StatCard label="Upcoming" value={stats.data?.upcoming ?? 0} />
        <StatCard label="Settled" value={stats.data?.settled ?? 0} />
        <StatCard label="Markets" value={stats.data?.marketTemplates ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create competition</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="key (epl)" value={comp.key} onChange={(e) => setComp({ ...comp, key: e.target.value })} />
          <select
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            value={comp.sportKey}
            onChange={(e) => setComp({ ...comp, sportKey: e.target.value })}
          >
            {sports.data?.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          <Input placeholder="name" value={comp.name} onChange={(e) => setComp({ ...comp, name: e.target.value })} />
          <Input placeholder="region" value={comp.region} onChange={(e) => setComp({ ...comp, region: e.target.value })} />
          <Input placeholder="season (opt)" value={comp.season} onChange={(e) => setComp({ ...comp, season: e.target.value })} />
          <Input placeholder="tournament (opt)" value={comp.tournament} onChange={(e) => setComp({ ...comp, tournament: e.target.value })} />
          <Button
            variant="gradient"
            disabled={!comp.key || !comp.name || createComp.isPending}
            onClick={() => createComp.mutate()}
          >
            {createComp.isPending ? <Spinner size={16} /> : 'Save competition'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create / update match</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full match definition (markets + odds) as JSON — fully data-driven, no code changes to add markets.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-[240px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            placeholder={MATCH_PLACEHOLDER}
            value={matchJson}
            onChange={(e) => setMatchJson(e.target.value)}
          />
          <Button variant="gradient" disabled={!matchJson || createMatch.isPending} onClick={() => createMatch.mutate()}>
            {createMatch.isPending ? <Spinner size={16} /> : 'Save match'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {matches.isLoading ? <Spinner /> : null}
          {matches.data?.map((m) => {
            const market = m.markets[0];
            return (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.id} · {m.sportKey} · {m.markets.length} markets
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={m.status === 'live' ? 'success' : m.status === 'settled' ? 'outline' : 'secondary'}>
                      {m.status}
                    </Badge>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={m.status}
                      onChange={(e) => setStatus.mutate({ id: m.id, status: e.target.value })}
                    >
                      {['scheduled', 'live', 'paused', 'finished', 'cancelled'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button variant="destructive" size="sm" onClick={() => removeMatch.mutate(m.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {market && m.status !== 'settled' ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                    <span className="text-xs text-muted-foreground">Settle {market.name}: winner</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={winners[m.id] ?? ''}
                      onChange={(e) => setWinners({ ...winners, [m.id]: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {market.selections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={!winners[m.id]}
                      onClick={() => settle.mutate({ id: m.id, marketId: market.id, selectionId: winners[m.id]! })}
                    >
                      Settle
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {matches.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
