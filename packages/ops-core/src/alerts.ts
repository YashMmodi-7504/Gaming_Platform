/**
 * Configurable alert rules and their evaluation. A rule watches a metric value;
 * when it breaches the threshold for a sustained window it transitions to
 * `firing`, and back to `ok` (via `resolved`) when it recovers. Pure and
 * time-injected.
 */

export type Comparator = '>' | '>=' | '<' | '<=' | '==';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'ok' | 'pending' | 'firing' | 'resolved';

export interface AlertRule {
  id: string;
  name: string;
  /** Metric key this rule evaluates (matches a snapshot key). */
  metric: string;
  comparator: Comparator;
  threshold: number;
  /** Seconds the breach must be sustained before firing. */
  forSeconds: number;
  severity: AlertSeverity;
  description?: string;
  enabled: boolean;
}

export interface AlertState {
  status: AlertStatus;
  /** Epoch ms the current breach started (for the sustain window). */
  breachedAt: number | null;
  /** Epoch ms the alert last changed status. */
  changedAt: number;
  lastValue: number;
}

export function emptyAlertState(now = 0): AlertState {
  return { status: 'ok', breachedAt: null, changedAt: now, lastValue: 0 };
}

function breaches(value: number, rule: AlertRule): boolean {
  switch (rule.comparator) {
    case '>':
      return value > rule.threshold;
    case '>=':
      return value >= rule.threshold;
    case '<':
      return value < rule.threshold;
    case '<=':
      return value <= rule.threshold;
    case '==':
      return value === rule.threshold;
    default:
      return false;
  }
}

export const Alerts = {
  breaches,

  /** Advance an alert's state given the current metric value and time. */
  evaluate(rule: AlertRule, state: AlertState, value: number, now: number): AlertState {
    if (!rule.enabled) return { ...state, status: 'ok', breachedAt: null, lastValue: value };
    const isBreaching = breaches(value, rule);

    if (isBreaching) {
      const breachedAt = state.breachedAt ?? now;
      const sustainedMs = now - breachedAt;
      if (sustainedMs >= rule.forSeconds * 1000) {
        return {
          status: 'firing',
          breachedAt,
          changedAt: state.status === 'firing' ? state.changedAt : now,
          lastValue: value,
        };
      }
      return { status: 'pending', breachedAt, changedAt: state.status === 'pending' ? state.changedAt : now, lastValue: value };
    }

    // Recovered.
    if (state.status === 'firing') {
      return { status: 'resolved', breachedAt: null, changedAt: now, lastValue: value };
    }
    return { status: 'ok', breachedAt: null, changedAt: state.status === 'ok' ? state.changedAt : now, lastValue: value };
  },
};
