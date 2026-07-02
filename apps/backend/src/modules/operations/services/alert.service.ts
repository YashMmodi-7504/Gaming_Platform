import { Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { Alerts, emptyAlertState, type AlertRule, type AlertState } from '@gaming-platform/ops-core';

import { PrismaService } from '../../database/prisma.service';
import { OperationsGateway } from '../operations.gateway';

const SCOPE = 'alert-rule';
const ENV = 'production';

/** Production default alert rules — every threshold the platform monitors. */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'high-error-rate', name: 'High error rate', metric: 'error_rate', comparator: '>', threshold: 0.05, forSeconds: 60, severity: 'critical', enabled: true },
  { id: 'high-latency', name: 'High latency (p95)', metric: 'latency_p95_ms', comparator: '>', threshold: 1000, forSeconds: 120, severity: 'warning', enabled: true },
  { id: 'db-down', name: 'Database unavailable', metric: 'database_up', comparator: '<', threshold: 1, forSeconds: 0, severity: 'critical', enabled: true },
  { id: 'redis-down', name: 'Redis unavailable', metric: 'redis_up', comparator: '<', threshold: 1, forSeconds: 0, severity: 'critical', enabled: true },
  { id: 'queue-backlog', name: 'Queue backlog', metric: 'queue_backlog', comparator: '>', threshold: 1000, forSeconds: 120, severity: 'warning', enabled: true },
  { id: 'memory-threshold', name: 'High memory', metric: 'memory_used_mb', comparator: '>', threshold: 1536, forSeconds: 120, severity: 'warning', enabled: true },
  { id: 'cpu-threshold', name: 'High CPU', metric: 'cpu_percent', comparator: '>', threshold: 85, forSeconds: 120, severity: 'warning', enabled: true },
  { id: 'ws-disconnect-spike', name: 'WebSocket disconnect spike', metric: 'ws_disconnects', comparator: '>', threshold: 100, forSeconds: 60, severity: 'warning', enabled: true },
  { id: 'failed-settlements', name: 'Failed settlements', metric: 'failed_settlements', comparator: '>', threshold: 5, forSeconds: 60, severity: 'critical', enabled: true },
  { id: 'wallet-inconsistency', name: 'Wallet inconsistency', metric: 'wallet_inconsistencies', comparator: '>', threshold: 0, forSeconds: 0, severity: 'critical', enabled: true },
];

export interface Incident {
  rule: AlertRule;
  state: AlertState;
}

/**
 * Configurable alerting. Built-in rules plus admin-defined overrides
 * (`ApplicationSetting`, scope `alert-rule`) are evaluated against live metric
 * values; sustained breaches fire incidents that broadcast to the alert center.
 */
@Injectable()
export class AlertService {
  private readonly states = new Map<string, AlertState>();
  private readonly active = new Map<string, Incident>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OperationsGateway,
  ) {}

  async rules(): Promise<AlertRule[]> {
    const rows = await this.prisma.applicationSetting.findMany({ where: { scope: SCOPE, environment: ENV } });
    const overrides = new Map(rows.map((r) => [r.key, r.value as unknown as AlertRule]));
    const merged = DEFAULT_ALERT_RULES.map((r) => overrides.get(r.id) ?? r);
    for (const [id, rule] of overrides) if (!merged.some((m) => m.id === id)) merged.push(rule);
    return merged;
  }

  async upsertRule(rule: AlertRule): Promise<AlertRule> {
    await this.prisma.applicationSetting.upsert({
      where: { scope_key_environment: { scope: SCOPE, key: rule.id, environment: ENV } },
      update: { value: rule as unknown as Prisma.InputJsonValue },
      create: { scope: SCOPE, key: rule.id, environment: ENV, valueType: 'JSON', value: rule as unknown as Prisma.InputJsonValue },
    });
    return rule;
  }

  /** Evaluate all rules against a snapshot of metric values. */
  async evaluate(values: Record<string, number>, now = Date.now()): Promise<Incident[]> {
    const rules = await this.rules();
    const fired: Incident[] = [];
    for (const rule of rules) {
      const value = values[rule.metric] ?? 0;
      const prev = this.states.get(rule.id) ?? emptyAlertState(now);
      const nextState = Alerts.evaluate(rule, prev, value, now);
      this.states.set(rule.id, nextState);

      const wasFiring = prev.status === 'firing';
      if (nextState.status === 'firing') {
        this.active.set(rule.id, { rule, state: nextState });
        if (!wasFiring) {
          fired.push({ rule, state: nextState });
          this.gateway.emitAlert({ rule, state: nextState });
        }
      } else if (wasFiring) {
        this.active.delete(rule.id);
        this.gateway.emitAlert({ rule, state: nextState, resolved: true });
      }
    }
    return fired;
  }

  activeIncidents(): Incident[] {
    return [...this.active.values()];
  }

  allStates(): Array<{ ruleId: string; state: AlertState }> {
    return [...this.states.entries()].map(([ruleId, state]) => ({ ruleId, state }));
  }
}
