/**
 * Rule-based fraud detection. Each rule turns account features into a weighted
 * {@link FraudSignal}; the aggregate produces a 0–100 fraud score and band. Pure
 * and explainable — every signal carries the evidence that triggered it.
 */

export type FraudSignalType =
  | 'multi-account'
  | 'account-sharing'
  | 'device-correlation'
  | 'ip-correlation'
  | 'suspicious-betting'
  | 'suspicious-wallet'
  | 'bot-activity'
  | 'impossible-win-rate'
  | 'velocity';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface FraudFeatures {
  accountId: string;
  /** Accounts that share at least one device fingerprint with this account. */
  sharedDeviceAccounts: string[];
  /** Accounts that share at least one IP with this account. */
  sharedIpAccounts: string[];
  /** Distinct devices used recently. */
  distinctDevices: number;
  /** Distinct IPs used in the last hour. */
  distinctIpsLastHour: number;
  /** Bets placed in the last minute. */
  betsLastMinute: number;
  /** Win rate 0..1 over a meaningful sample. */
  winRate: number;
  /** Number of settled rounds the win rate is based on. */
  roundsPlayed: number;
  /** Deposits in the last hour. */
  depositsLastHour: number;
  /** Std-dev of time between actions (ms); near-zero ⇒ automated. */
  actionIntervalStdDevMs: number;
  /** Withdrawal-to-deposit ratio. */
  withdrawalRatio: number;
}

export interface FraudSignal {
  type: FraudSignalType;
  severity: Severity;
  /** Contribution to the fraud score (0..100). */
  score: number;
  detail: string;
}

const SEVERITY_SCORE: Record<Severity, number> = { low: 10, medium: 25, high: 45, critical: 70 };

export const FraudRules = {
  evaluate(f: FraudFeatures): FraudSignal[] {
    const signals: FraudSignal[] = [];
    const add = (type: FraudSignalType, severity: Severity, detail: string) =>
      signals.push({ type, severity, score: SEVERITY_SCORE[severity], detail });

    if (f.sharedDeviceAccounts.length >= 1) {
      const sev = f.sharedDeviceAccounts.length >= 3 ? 'critical' : 'high';
      add('multi-account', sev, `Shares devices with ${f.sharedDeviceAccounts.length} account(s)`);
      add('device-correlation', 'medium', `Device fingerprint reused across accounts`);
    }
    if (f.sharedIpAccounts.length >= 3) {
      add('ip-correlation', f.sharedIpAccounts.length >= 6 ? 'high' : 'medium', `Shares IPs with ${f.sharedIpAccounts.length} accounts`);
    }
    if (f.distinctIpsLastHour >= 5) {
      add('account-sharing', f.distinctIpsLastHour >= 10 ? 'high' : 'medium', `${f.distinctIpsLastHour} distinct IPs in the last hour`);
    }
    if (f.betsLastMinute >= 60) {
      add('velocity', f.betsLastMinute >= 200 ? 'critical' : 'high', `${f.betsLastMinute} bets in the last minute`);
    }
    if (f.roundsPlayed >= 50 && f.winRate >= 0.8) {
      add('impossible-win-rate', f.winRate >= 0.95 ? 'critical' : 'high', `${Math.round(f.winRate * 100)}% win rate over ${f.roundsPlayed} rounds`);
    }
    if (f.roundsPlayed >= 100 && f.actionIntervalStdDevMs < 50) {
      add('bot-activity', 'high', `Near-constant action interval (σ=${Math.round(f.actionIntervalStdDevMs)}ms)`);
    }
    if (f.depositsLastHour >= 10) {
      add('suspicious-wallet', f.depositsLastHour >= 25 ? 'high' : 'medium', `${f.depositsLastHour} deposits in the last hour`);
    }
    if (f.withdrawalRatio >= 0.98 && f.roundsPlayed < 10) {
      add('suspicious-betting', 'medium', `Withdraws almost everything with minimal play (ratio ${f.withdrawalRatio.toFixed(2)})`);
    }
    return signals;
  },

  /** Aggregate signals into a 0–100 fraud score (capped). */
  score(signals: FraudSignal[]): number {
    return Math.min(100, signals.reduce((sum, s) => sum + s.score, 0));
  },

  band(score: number): Severity {
    if (score >= 70) return 'critical';
    if (score >= 45) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  },

  assess(f: FraudFeatures): { score: number; band: Severity; signals: FraudSignal[] } {
    const signals = FraudRules.evaluate(f);
    const score = FraudRules.score(signals);
    return { score, band: FraudRules.band(score), signals };
  },
};
