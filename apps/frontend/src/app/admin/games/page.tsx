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
import { adminGamesApi } from '@/lib/admin-games-api';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'warning' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  INACTIVE: 'outline',
  MAINTENANCE: 'warning',
  ARCHIVED: 'outline',
  DEPRECATED: 'destructive',
};

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

export default function AdminGamesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const stats = useQuery({ queryKey: ['admin-game-stats'], queryFn: adminGamesApi.statistics });
  const games = useQuery({
    queryKey: ['admin-games', search],
    queryFn: () => adminGamesApi.list({ search: search || undefined, limit: 50 }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-games'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-game-stats'] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminGamesApi.setStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Status updated');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const toggleMaintenance = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminGamesApi.setMaintenance(id, enabled),
    onSuccess: () => {
      invalidate();
      toast.success('Maintenance updated');
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      adminGamesApi.setFlags(id, { isFeatured }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Game management" description="Manage the catalog, status, and visibility." />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.data?.totalGames ?? '—'} />
        <StatCard label="Active" value={stats.data?.byStatus.ACTIVE ?? 0} />
        <StatCard label="Draft" value={stats.data?.byStatus.DRAFT ?? 0} />
        <StatCard label="Featured" value={stats.data?.featured ?? 0} />
        <StatCard label="Maintenance" value={stats.data?.inMaintenance ?? 0} />
        <StatCard label="Providers" value={stats.data?.providers ?? 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Games</CardTitle>
          <Input
            placeholder="Search…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {games.isLoading ? <Spinner /> : null}
          {games.data?.items.map((g) => (
            <div
              key={g.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{g.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {g.provider?.name} · {g.category?.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[g.status] ?? 'outline'}>{g.status}</Badge>
                {g.maintenanceMode ? <Badge variant="warning">Maintenance</Badge> : null}
                {g.isFeatured ? <Badge variant="default">Featured</Badge> : null}

                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={g.status}
                  onChange={(e) => setStatus.mutate({ id: g.id, status: e.target.value })}
                >
                  {['DRAFT', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED', 'DEPRECATED'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFeatured.mutate({ id: g.id, isFeatured: !g.isFeatured })}
                >
                  {g.isFeatured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toggleMaintenance.mutate({ id: g.id, enabled: !g.maintenanceMode })
                  }
                >
                  {g.maintenanceMode ? 'End maint.' : 'Maintenance'}
                </Button>
              </div>
            </div>
          ))}
          {games.data?.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No games found.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
