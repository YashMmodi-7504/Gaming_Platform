/**
 * Dependency health rollup and a tiny trace-context model. Pure helpers used by
 * the operations module to compute overall service status and propagate trace
 * ids across requests, logs and metrics.
 */

export type HealthStatus = 'up' | 'degraded' | 'down';

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  /** Whether this dependency is required for the service to be `up`. */
  critical: boolean;
  latencyMs?: number;
  detail?: string;
}

/** Roll a set of dependency statuses into an overall service status. */
export function rollup(deps: DependencyHealth[]): HealthStatus {
  if (deps.some((d) => d.critical && d.status === 'down')) return 'down';
  if (deps.some((d) => d.status === 'down' || d.status === 'degraded')) return 'degraded';
  return 'up';
}

export interface ServiceNode {
  name: string;
  dependsOn: string[];
}

/** A static service dependency graph for the operations dashboard. */
export function dependencyGraph(): ServiceNode[] {
  return [
    { name: 'api', dependsOn: ['database', 'redis'] },
    { name: 'wallet-engine', dependsOn: ['database', 'redis'] },
    { name: 'game-engines', dependsOn: ['redis', 'wallet-engine'] },
    { name: 'tournament', dependsOn: ['database', 'redis', 'wallet-engine'] },
    { name: 'realtime', dependsOn: ['redis'] },
    { name: 'queue', dependsOn: ['redis'] },
  ];
}

// ---- Tracing ---------------------------------------------------------------

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/** A 16-hex id from a counter + seed (no Math.random for determinism in tests). */
export function makeId(seedHex: string, counter: number): string {
  const base = `${seedHex}${counter.toString(16)}`.padEnd(16, '0');
  return base.slice(0, 16);
}

export class TraceIdFactory {
  private counter = 0;
  constructor(private readonly seedHex = 'a1b2c3d4') {}

  next(parent?: TraceContext): TraceContext {
    this.counter += 1;
    const spanId = makeId(this.seedHex, this.counter);
    if (parent) return { traceId: parent.traceId, spanId, parentSpanId: parent.spanId };
    return { traceId: makeId(this.seedHex.split('').reverse().join(''), this.counter), spanId };
  }
}
