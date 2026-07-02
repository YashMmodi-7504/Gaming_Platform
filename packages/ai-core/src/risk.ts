/**
 * Player risk scoring and responsible-gaming monitoring. Combines fraud signals
 * with behavioural indicators (loss chasing, session length, deposit velocity)
 * into a 0–100 risk score plus actionable RG flags. Pure.
 */

export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface BehaviourFeatures {
  /** Longest continuous session in minutes. */
  longestSessionMinutes: number;
  /** Net loss over the trailing window (positive = losing). */
  netLoss: number;
  /** Deposit count in the trailing 24h. */
  depositsLast24h: number;
  /** Increasing bet sizes after losses (0..1 likelihood of loss-chasing). */
  lossChasingScore: number;
  /** Nighttime play ratio 0..1 (proxy for problematic patterns). */
  nightPlayRatio: number;
  /** Self-reported / configured deposit limit utilisation 0..1+. */
  depositLimitUtilisation: number;
}

export interface RgFlag {
  code: string;
  message: string;
  severity: RiskBand;
}

export const RiskScoring = {
  /** Behavioural risk component (0..60) from RG indicators. */
  behaviourRisk(b: BehaviourFeatures): number {
    let score = 0;
    if (b.longestSessionMinutes > 180) score += Math.min(15, (b.longestSessionMinutes - 180) / 20);
    if (b.depositsLast24h > 5) score += Math.min(15, (b.depositsLast24h - 5) * 2);
    score += b.lossChasingScore * 15;
    score += b.nightPlayRatio * 8;
    if (b.depositLimitUtilisation > 0.9) score += Math.min(7, (b.depositLimitUtilisation - 0.9) * 70);
    return Math.min(60, score);
  },

  responsibleGaming(b: BehaviourFeatures): RgFlag[] {
    const flags: RgFlag[] = [];
    if (b.longestSessionMinutes > 240) {
      flags.push({ code: 'long-session', message: `Session exceeded ${b.longestSessionMinutes}m`, severity: 'high' });
    }
    if (b.lossChasingScore >= 0.6) {
      flags.push({ code: 'loss-chasing', message: 'Bet sizes rising after losses', severity: 'high' });
    }
    if (b.depositsLast24h >= 8) {
      flags.push({ code: 'deposit-frequency', message: `${b.depositsLast24h} deposits in 24h`, severity: 'medium' });
    }
    if (b.depositLimitUtilisation >= 1) {
      flags.push({ code: 'limit-reached', message: 'Deposit limit reached', severity: 'medium' });
    }
    if (b.nightPlayRatio >= 0.7) {
      flags.push({ code: 'night-play', message: 'Predominantly late-night play', severity: 'low' });
    }
    return flags;
  },

  /** Overall risk score: behaviour (0..60) + fraud (0..40 from a 0..100 score). */
  overall(behaviour: BehaviourFeatures, fraudScore: number): { score: number; band: RiskBand } {
    const score = Math.min(100, Math.round(RiskScoring.behaviourRisk(behaviour) + (fraudScore / 100) * 40));
    return { score, band: RiskScoring.band(score) };
  },

  band(score: number): RiskBand {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  },
};
