'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, cn } from '@gaming-platform/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { PageHeader } from '@/components/shared/page-header';
import { clientConfig } from '@/lib/config';
import { operationsApi, type OpsOverview } from '@/lib/operations-api';
import { useAuthStore } from '@/stores/auth-store';

type Tab = 'overview' | 'metrics' | 'logs' | 'alerts' | 'queue';
const TABS: Tab[] = ['overview', 'metrics', 'logs', 'alerts', 'queue'];

const STATUS_COLOR: Record<string, string> = { up: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-red-500' };

export default function OperationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const history = useRef<{ cpu: number[]; mem: number[]; tput: number[] }>({ cpu: [], mem: [], tput: [] });

  const overview = useQuery({ queryKey: ['ops-overview'], queryFn: operationsApi.overview, refetchInterval: 10000 });

  if (overview.data) {
    pushSample(history.current.cpu, overview.data.system.cpuPercent);
    pushSample(history.current.mem, overview.data.system.memoryUsedMb);
    pushSample(history.current.tput, overview.data.api.throughput);
  }

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(`${clientConfig.wsUrl}/operations`, { auth: { token }, transports: ['websocket'] });
    socket.on('operations:overview', (data: OpsOverview) => queryClient.setQueryData(['ops-overview'], data));
    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  return (
    <div className="space-y-6">
      <PageHeader title="Operations" description="Live health, metrics, logs, alerts and background jobs." />

      {overview.data ? (
        <div className="flex items-center gap-3">
          <span className={cn('h-3 w-3 rounded-full', STATUS_COLOR[overview.data.status])} />
          <span className="font-semibold capitalize">{overview.data.status}</span>
          <span className="text-xs text-muted-foreground">
            updated {new Date(overview.data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-lg bg-black/5 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {overview.isLoading ? <Spinner /> : null}

      {tab === 'overview' && overview.data ? <Overview data={overview.data} history={history.current} /> : null}
      {tab === 'metrics' ? <Metrics /> : null}
      {tab === 'logs' ? <Logs /> : null}
      {tab === 'alerts' ? <Alerts /> : null}
      {tab === 'queue' ? <Queue /> : null}
    </div>
  );
}

function Overview({ data, history }: { data: OpsOverview; history: { cpu: number[]; mem: number[]; tput: number[] } }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="CPU" value={`${data.system.cpuPercent}%`} series={history.cpu} />
        <MetricCard label="Memory (MB)" value={`${data.system.memoryUsedMb}`} series={history.mem} />
        <MetricCard label="Throughput" value={`${data.api.throughput}`} series={history.tput} />
        <MetricCard label="Error rate" value={`${(data.api.errorRate * 100).toFixed(2)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.health.dependencies.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLOR[d.status])} />
                  {d.name}
                  {d.critical ? <span className="text-[10px] text-muted-foreground">critical</span> : null}
                </span>
                <span className="text-muted-foreground">{d.latencyMs != null ? `${d.latencyMs}ms` : d.detail ?? ''}</span>
              </div>
            ))}
            <div className="pt-2 text-xs text-muted-foreground">
              p95 latency {data.api.latencyP95Ms.toFixed(0)}ms · event-loop lag {data.system.eventLoopLagMs}ms · uptime{' '}
              {Math.round(data.system.uptimeSeconds / 60)}m
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active incidents.</p>
            ) : (
              data.alerts.map((a) => (
                <div key={a.rule.id} className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm">
                  <span>{a.rule.name}</span>
                  <Badge variant="destructive">{a.rule.severity}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, series }: { label: string; value: string; series?: number[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {series && series.length > 1 ? <Sparkline values={series} /> : null}
      </CardContent>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-8 w-full">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
    </svg>
  );
}

function Metrics() {
  const metrics = useQuery({ queryKey: ['ops-metrics'], queryFn: operationsApi.metrics, refetchInterval: 10000 });
  if (metrics.isLoading || !metrics.data) return <Spinner />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Counters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs">
          {Object.entries(metrics.data.counters).slice(0, 40).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="truncate text-muted-foreground">{k}</span>
              <span className="tabular-nums">{v}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Latency histograms (p95)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs">
          {Object.entries(metrics.data.histograms).slice(0, 40).map(([k, h]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="truncate text-muted-foreground">{k}</span>
              <span className="tabular-nums">p95 {h.p95.toFixed(1)} · max {h.max.toFixed(1)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Logs() {
  const [level, setLevel] = useState('');
  const logs = useQuery({ queryKey: ['ops-logs', level], queryFn: () => operationsApi.logs({ level: level || undefined }), refetchInterval: 5000 });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Logs</CardTitle>
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </CardHeader>
      <CardContent className="max-h-[480px] space-y-0.5 overflow-auto font-mono text-xs">
        {logs.data?.entries.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className={cn(e.level === 'error' ? 'text-red-400' : e.level === 'warn' ? 'text-amber-400' : 'text-emerald-400')}>
              {e.level.toUpperCase()}
            </span>
            <span className="truncate">{e.message}</span>
          </div>
        ))}
        {logs.data && logs.data.entries.length === 0 ? <p className="text-muted-foreground">No logs.</p> : null}
      </CardContent>
    </Card>
  );
}

function Alerts() {
  const rules = useQuery({ queryKey: ['ops-alert-rules'], queryFn: operationsApi.alerts });
  const active = useQuery({ queryKey: ['ops-alert-active'], queryFn: operationsApi.activeAlerts, refetchInterval: 10000 });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.data && active.data.length > 0 ? (
            active.data.map((a) => (
              <div key={a.rule.id} className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm">
                <span>{a.rule.name} · value {a.state.lastValue}</span>
                <Badge variant="destructive">{a.rule.severity}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">All clear.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Alert rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.data?.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.metric} {r.comparator} {r.threshold} for {r.forSeconds}s
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.severity === 'critical' ? 'destructive' : 'warning'}>{r.severity}</Badge>
                <Badge variant={r.enabled ? 'success' : 'outline'}>{r.enabled ? 'on' : 'off'}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Queue() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ['ops-queue'], queryFn: operationsApi.queue, refetchInterval: 5000 });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Backlog" value={`${queue.data?.stats.backlog ?? 0}`} />
        <MetricCard label="Completed" value={`${queue.data?.stats.byStatus.completed ?? 0}`} />
        <MetricCard label="Failed" value={`${queue.data?.stats.byStatus.failed ?? 0}`} />
        <MetricCard label="Dead-letter" value={`${queue.data?.stats.deadLetter ?? 0}`} />
        <MetricCard label="Queues" value={`${queue.data?.stats.queues.length ?? 0}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dead-letter queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {queue.data && queue.data.deadLetter.length > 0 ? (
            queue.data.deadLetter.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span className="truncate">
                  <span className="font-mono text-xs text-muted-foreground">{j.queue}</span> · {j.lastError}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => operationsApi.retryJob(j.id).then(() => queryClient.invalidateQueries({ queryKey: ['ops-queue'] }))}
                >
                  Retry
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No dead-lettered jobs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function pushSample(arr: number[], v: number): void {
  arr.push(v);
  if (arr.length > 30) arr.shift();
}
