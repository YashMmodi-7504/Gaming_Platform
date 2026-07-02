/**
 * Production-safe client monitoring hooks. In development everything logs to the
 * console; in production the reporters funnel through `sink()`, which is a no-op
 * unless a host wires `window.__gpMonitor` (e.g. to forward to an APM / Sentry).
 * Nothing here throws, imports a vendor SDK, or blocks rendering.
 */
const isDev = process.env.NODE_ENV !== 'production';

type MonitorEvent =
  | { kind: 'web-vital'; name: string; value: number; rating?: string; id: string }
  | { kind: 'error'; message: string; stack?: string; source?: string }
  | { kind: 'mark'; name: string; detail?: unknown };

interface MonitorHost {
  capture?: (e: MonitorEvent) => void;
}

function sink(e: MonitorEvent): void {
  try {
    const host = (window as unknown as { __gpMonitor?: MonitorHost }).__gpMonitor;
    host?.capture?.(e);
  } catch {
    /* never let monitoring break the app */
  }
}

export interface WebVitalMetric {
  name: string;
  value: number;
  rating?: string;
  id: string;
}

export function reportVital(metric: WebVitalMetric): void {
  const e: MonitorEvent = { kind: 'web-vital', ...metric };
  if (isDev) {
    console.info(`[web-vital] ${metric.name}=${Math.round(metric.value)} (${metric.rating ?? 'n/a'})`);
  }
  sink(e);
}

export function logClientError(error: unknown, source?: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const e: MonitorEvent = { kind: 'error', message: err.message, stack: err.stack, source };
  if (isDev) {
    console.error(`[client-error]${source ? ` (${source})` : ''}`, err);
  }
  sink(e);
}

/** A lightweight performance mark for development diagnostics. */
export function mark(name: string, detail?: unknown): void {
  try {
    performance.mark?.(`gp:${name}`);
  } catch {
    /* ignore */
  }
  if (isDev && detail !== undefined) {
    console.info(`[perf] ${name}`, detail);
  }
  sink({ kind: 'mark', name, detail });
}
