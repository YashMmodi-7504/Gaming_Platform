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
import { adminCardApi } from '@/lib/card-api';

const EVAL_MODES = [
  'poker-rank',
  'high-card',
  'point-total',
  'blackjack',
  'sum-points',
  'side-match',
  'over-under',
];

const RULES_PLACEHOLDER = `{
  "evaluationMode": "high-card",
  "sides": ["dragon", "tiger"],
  "decks": 1,
  "bets": [
    { "key": "dragon", "label": "Dragon", "payout": 2 },
    { "key": "tiger", "label": "Tiger", "payout": 2 }
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

export default function AdminCardPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ['admin-card-stats'], queryFn: adminCardApi.statistics });
  const variants = useQuery({ queryKey: ['admin-card-variants'], queryFn: adminCardApi.variants });
  const replays = useQuery({ queryKey: ['admin-card-replays'], queryFn: adminCardApi.replays });

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [rules, setRules] = useState('');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-card-variants'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-card-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['card-variants'] });
  };

  const create = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rules || '{}') as Record<string, unknown>;
      } catch {
        throw new Error('Rules must be valid JSON');
      }
      return adminCardApi.create({ key, name, rules: parsed });
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
      enabled ? adminCardApi.enable(k) : adminCardApi.disable(k),
    onSuccess: () => {
      invalidate();
      toast.success('Variant updated');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (k: string) => adminCardApi.remove(k),
    onSuccess: () => {
      invalidate();
      toast.success('Variant deleted');
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? 'Failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Card Engine"
        description="Manage data-driven card variants, payouts, and provably-fair replays."
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
            Add a new card game with rule configuration only — no backend changes required.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Key</label>
              <Input
                placeholder="lightning-dragon"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                placeholder="Lightning Dragon"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Rule configuration (JSON) · evaluationMode ∈ {EVAL_MODES.join(', ')}
            </label>
            <textarea
              className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
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
          <CardTitle>Variants</CardTitle>
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
                  {v.key} · {v.evaluationMode} · {v.betCount} bets · {v.sides.join('/') || 'no sides'}
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
