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
import { adminRouletteApi } from '@/lib/roulette-api';

const RULES_PLACEHOLDER = `{
  "houseRules": { "laPartage": true, "enPrison": false },
  "limits": { "min": 1, "max": 5000, "tableMax": 25000 }
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

export default function AdminRoulettePage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-roulette-stats'], queryFn: adminRouletteApi.statistics });
  const variants = useQuery({ queryKey: ['admin-roulette-variants'], queryFn: adminRouletteApi.variants });
  const replays = useQuery({ queryKey: ['admin-roulette-replays'], queryFn: adminRouletteApi.replays });

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [rules, setRules] = useState('');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-roulette-variants'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-roulette-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['roulette-variants'] });
  };

  const create = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rules || '{}') as Record<string, unknown>;
      } catch {
        throw new Error('Rules must be valid JSON');
      }
      return adminRouletteApi.create({ key, name, rules: parsed });
    },
    onSuccess: () => {
      invalidate();
      setKey('');
      setName('');
      setRules('');
      toast.success('Variant created');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed to create variant'),
  });

  const setEnabled = useMutation({
    mutationFn: ({ k, enabled }: { k: string; enabled: boolean }) =>
      enabled ? adminRouletteApi.enable(k) : adminRouletteApi.disable(k),
    onSuccess: () => {
      invalidate();
      toast.success('Variant updated');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (k: string) => adminRouletteApi.remove(k),
    onSuccess: () => {
      invalidate();
      toast.success('Variant deleted');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roulette Engine"
        description="Manage data-driven roulette tables, wheels, payouts, limits and provably-fair replays."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Variants" value={stats.data?.totalVariants ?? '—'} />
        <StatCard label="Built-in" value={stats.data?.builtIn ?? 0} />
        <StatCard label="Custom" value={stats.data?.custom ?? 0} />
        <StatCard label="Disabled" value={stats.data?.disabled ?? 0} />
        <StatCard label="Replays" value={stats.data?.replays ?? 0} />
        <StatCard label="Saved states" value={stats.data?.savedStates ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create variant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a new roulette table with rule configuration only — no backend changes required.
            Override a built-in by reusing its key, or define a fresh wheel layout.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Key</label>
              <Input placeholder="lightning-european" value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input placeholder="Lightning European" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Rule configuration (JSON) · layout, betTypes, limits, houseRules
            </label>
            <textarea
              className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              placeholder={RULES_PLACEHOLDER}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          </div>
          <Button
            variant="gradient"
            disabled={!key || !name || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Spinner size={16} /> : 'Create variant'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {variants.isLoading ? <Spinner /> : null}
          {variants.data?.map((v) => (
            <div
              key={v.key}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{v.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.key} · {v.pockets} pockets · {v.betTypeCount} bet types · limits {v.limits.min}–
                  {v.limits.max}
                  {v.houseRules.laPartage ? ' · la partage' : ''}
                  {v.houseRules.enPrison ? ' · en prison' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {v.builtIn ? <Badge variant="secondary">Built-in</Badge> : <Badge>Custom</Badge>}
                <Badge variant={v.enabled ? 'success' : 'outline'}>
                  {v.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {v.builtIn ? null : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEnabled.mutate({ k: v.key, enabled: !v.enabled })}
                    >
                      {v.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete variant "${v.name}"?`)) remove.mutate(v.key);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent replays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {replays.isLoading ? <Spinner /> : null}
          {replays.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No replays recorded.</p>
          ) : null}
          {replays.data?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
            >
              <span className="truncate font-mono text-xs">{r.seed}</span>
              <span className="text-xs text-muted-foreground">
                {r.frameCount} frames · {r.durationMs}ms
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
