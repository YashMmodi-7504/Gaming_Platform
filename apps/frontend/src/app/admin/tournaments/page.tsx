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
import { adminTournamentApi, tournamentApi } from '@/lib/tournament-api';

const FORMATS = ['single-elimination', 'double-elimination', 'round-robin', 'swiss', 'knockout', 'leaderboard'];

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

export default function AdminTournamentsPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-tnmt-stats'], queryFn: adminTournamentApi.statistics });
  const list = useQuery({ queryKey: ['admin-tnmt-list'], queryFn: () => tournamentApi.list() });

  const [form, setForm] = useState({ name: '', format: 'single-elimination', capacity: '16', entryFee: '0', currencyId: '' });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-tnmt-list'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-tnmt-stats'] });
  };

  const create = useMutation({
    mutationFn: () =>
      adminTournamentApi.create({
        name: form.name,
        format: form.format,
        capacity: Number(form.capacity),
        entryFee: form.entryFee,
        currencyId: form.currencyId || undefined,
        prize: {
          type: 'percentage',
          currencyId: form.currencyId || null,
          guaranteed: '0',
          entryContribution: 1,
          tiers: [
            { fromRank: 1, toRank: 1, value: 0.6 },
            { fromRank: 2, toRank: 2, value: 0.3 },
            { fromRank: 3, toRank: 4, value: 0.1 },
          ],
        },
      }),
    onSuccess: () => {
      invalidate();
      setForm({ ...form, name: '' });
      toast.success('Tournament created');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const open = useMutationFactory(adminTournamentApi.open, 'Registration opened', invalidate);
  const start = useMutationFactory(adminTournamentApi.start, 'Started', invalidate);
  const complete = useMutationFactory(adminTournamentApi.complete, 'Completed & prizes paid', invalidate);
  const cancel = useMutationFactory(adminTournamentApi.cancel, 'Cancelled & refunded', invalidate);

  return (
    <div className="space-y-6">
      <PageHeader title="Tournaments" description="Build, run and settle tournaments. Prizes pay through the Wallet Engine." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.data?.total ?? '—'} />
        <StatCard label="Registration" value={stats.data?.registration ?? 0} />
        <StatCard label="Live" value={stats.data?.live ?? 0} />
        <StatCard label="Completed" value={stats.data?.completed ?? 0} />
        <StatCard label="Participants" value={stats.data?.totalParticipants ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create tournament</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Input placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <Input placeholder="Entry fee" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} />
          <Input placeholder="Currency ID (paid)" value={form.currencyId} onChange={(e) => setForm({ ...form, currencyId: e.target.value })} />
          <Button variant="gradient" className="sm:col-span-5" disabled={!form.name || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Spinner size={16} /> : 'Create'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tournaments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading ? <Spinner /> : null}
          {list.data?.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.format} · {t.registered}/{t.capacity} · pool {t.prizePool}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={t.status === 'live' ? 'success' : t.status === 'completed' ? 'outline' : 'secondary'}>{t.status}</Badge>
                {t.status === 'draft' ? (
                  <Button size="sm" variant="outline" onClick={() => open.mutate(t.id)}>Open</Button>
                ) : null}
                {t.status === 'registration' ? (
                  <Button size="sm" variant="outline" onClick={() => start.mutate(t.id)}>Start</Button>
                ) : null}
                {t.status === 'live' ? (
                  <Button size="sm" variant="gradient" onClick={() => complete.mutate(t.id)}>Complete</Button>
                ) : null}
                {t.status !== 'completed' && t.status !== 'cancelled' ? (
                  <Button size="sm" variant="destructive" onClick={() => cancel.mutate(t.id)}>Cancel</Button>
                ) : null}
              </div>
            </div>
          ))}
          {list.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No tournaments yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/** Small hook factory to build an id-action mutation with toast + invalidation. */
function useMutationFactory(fn: (id: string) => Promise<unknown>, label: string, invalidate: () => void) {
  return useMutation({
    mutationFn: (id: string) => fn(id),
    onSuccess: () => {
      invalidate();
      toast.success(label);
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });
}
