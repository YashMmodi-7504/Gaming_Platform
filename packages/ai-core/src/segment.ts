/**
 * Player segmentation (RFM) and churn prediction. Deterministic heuristics over
 * recency / frequency / monetary features produce a segment label and a churn
 * probability — the basis for targeting, bonuses and retention campaigns.
 */

export type Segment = 'vip' | 'high-value' | 'regular' | 'casual' | 'at-risk' | 'churned' | 'new';

export interface RfmFeatures {
  /** Days since last activity. */
  recencyDays: number;
  /** Sessions in the trailing window. */
  frequency: number;
  /** Net deposits / turnover in the trailing window. */
  monetary: number;
  /** Account age in days. */
  tenureDays: number;
}

export const Segmentation = {
  segment(f: RfmFeatures): Segment {
    if (f.tenureDays <= 7 && f.frequency <= 3) return 'new';
    if (f.recencyDays > 60) return 'churned';
    if (f.recencyDays > 21) return 'at-risk';
    if (f.monetary >= 5000 && f.frequency >= 20) return 'vip';
    if (f.monetary >= 1000 && f.frequency >= 10) return 'high-value';
    if (f.frequency >= 5) return 'regular';
    return 'casual';
  },

  /** Churn probability (0..1) from inactivity and engagement. */
  churnProbability(f: RfmFeatures): number {
    const recencyTerm = Math.min(1, f.recencyDays / 60); // 60+ days idle ⇒ high
    const frequencyTerm = 1 / (1 + f.frequency); // low frequency ⇒ higher churn
    const tenureGuard = f.tenureDays < 14 ? 0.1 : 0; // new accounts noisier
    const p = 0.6 * recencyTerm + 0.4 * frequencyTerm + tenureGuard;
    return Number(Math.max(0, Math.min(1, p)).toFixed(4));
  },

  /** A recommended retention action for a churn probability + segment. */
  retentionAction(segment: Segment, churn: number): string {
    if (segment === 'churned') return 'win-back-bonus';
    if (churn >= 0.6) return 'reactivation-offer';
    if (segment === 'vip' || segment === 'high-value') return 'vip-perk';
    if (segment === 'new') return 'onboarding-mission';
    return 'standard-promo';
  },
};
