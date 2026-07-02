import { apiClient, unwrap } from './api-client';

export interface SystemMetrics {
  uptimeSeconds: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  cpuPercent: number;
  eventLoopLagMs: number;
  pid: number;
}

export interface DependencyHealth {
  name: string;
  status: 'up' | 'degraded' | 'down';
  critical: boolean;
  latencyMs?: number;
  detail?: string;
}

export interface OpsOverview {
  status: 'up' | 'degraded' | 'down';
  generatedAt: string;
  system: SystemMetrics;
  api: { throughput: number; errorRate: number; latencyP95Ms: number };
  health: { status: string; dependencies: DependencyHealth[]; graph: Array<{ name: string; dependsOn: string[] }> };
  queue: { backlog: number; byStatus: Record<string, number>; deadLetter: number; queues: string[] };
  circuits: Record<string, string>;
  alerts: Array<{ rule: AlertRule; state: AlertState }>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  comparator: string;
  threshold: number;
  forSeconds: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  description?: string;
}

export interface AlertState {
  status: string;
  lastValue: number;
  changedAt: number;
}

export interface LogEntry {
  ts: number;
  level: string;
  message: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  traceId?: string;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, { count: number; mean: number; p50: number; p95: number; p99: number; max: number }>;
}

export const operationsApi = {
  overview: () => unwrap<OpsOverview>(apiClient.get('/admin/operations/overview')),
  metrics: () => unwrap<MetricsSnapshot>(apiClient.get('/admin/operations/metrics')),
  logs: (params: { level?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    const qs = q.toString();
    return unwrap<{ entries: LogEntry[]; stats: { total: number; errors: number; warnings: number } }>(
      apiClient.get(`/admin/operations/logs${qs ? `?${qs}` : ''}`),
    );
  },
  queue: () =>
    unwrap<{ stats: OpsOverview['queue']; deadLetter: Array<{ id: string; queue: string; lastError?: string }> }>(
      apiClient.get('/admin/operations/queue'),
    ),
  retryJob: (jobId: string) => unwrap<{ retried: boolean }>(apiClient.post(`/admin/operations/queue/${jobId}/retry`, {})),
  alerts: () => unwrap<AlertRule[]>(apiClient.get('/admin/operations/alerts')),
  activeAlerts: () => unwrap<Array<{ rule: AlertRule; state: AlertState }>>(apiClient.get('/admin/operations/alerts/active')),
  upsertAlert: (rule: AlertRule) => unwrap<AlertRule>(apiClient.post('/admin/operations/alerts', rule)),
};
