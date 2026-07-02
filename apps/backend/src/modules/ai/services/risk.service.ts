import { Injectable } from '@nestjs/common';
import { RiskScoring, Segmentation, type BehaviourFeatures, type RfmFeatures } from '@gaming-platform/ai-core';

import { PrismaService } from '../../database/prisma.service';
import { FraudService } from './fraud.service';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Player risk & responsible-gaming. Derives behavioural and RFM features from
 * sessions and deposits, combines them with the fraud score, and produces a risk
 * band, RG flags, a segment and a churn probability via ai-core.
 */
@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraud: FraudService,
  ) {}

  async behaviour(userId: string): Promise<BehaviourFeatures> {
    const now = Date.now();
    const [sessions, depositsLast24h, results] = await Promise.all([
      this.prisma.gameSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { startedAt: true, endedAt: true, totalBet: true, totalWin: true, createdAt: true },
      }),
      this.prisma.depositRequest.count({ where: { userId, createdAt: { gte: new Date(now - DAY) } } }),
      this.prisma.gameResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { outcome: true, betAmount: true },
      }),
    ]);

    let longestSessionMinutes = 0;
    let netLoss = 0;
    let nightSessions = 0;
    for (const s of sessions) {
      const end = s.endedAt ?? s.startedAt;
      const minutes = Math.max(0, (end.getTime() - s.startedAt.getTime()) / 60000);
      longestSessionMinutes = Math.max(longestSessionMinutes, minutes);
      netLoss += Number(s.totalBet) - Number(s.totalWin);
      const hour = s.startedAt.getUTCHours();
      if (hour >= 0 && hour < 6) nightSessions += 1;
    }

    return {
      longestSessionMinutes: Math.round(longestSessionMinutes),
      netLoss: Number(netLoss.toFixed(2)),
      depositsLast24h,
      lossChasingScore: this.lossChasing(results.map((r) => Number(r.betAmount)).reverse()),
      nightPlayRatio: sessions.length ? nightSessions / sessions.length : 0,
      depositLimitUtilisation: 0,
    };
  }

  async rfm(userId: string): Promise<RfmFeatures> {
    const now = Date.now();
    const [user, lastSession, frequency, monetaryAgg] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      this.prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.gameSession.count({ where: { userId, createdAt: { gte: new Date(now - 30 * DAY) } } }),
      this.prisma.gameSession.aggregate({ _sum: { totalBet: true }, where: { userId } }),
    ]);
    return {
      recencyDays: lastSession ? Math.round((now - lastSession.createdAt.getTime()) / DAY) : 999,
      frequency,
      monetary: Number(monetaryAgg._sum.totalBet ?? 0),
      tenureDays: user ? Math.round((now - user.createdAt.getTime()) / DAY) : 0,
    };
  }

  /** Full player risk profile. */
  async profile(userId: string) {
    const [behaviour, rfm, fraud] = await Promise.all([
      this.behaviour(userId),
      this.rfm(userId),
      this.fraud.assess(userId),
    ]);
    const risk = RiskScoring.overall(behaviour, fraud.score);
    const segment = Segmentation.segment(rfm);
    const churn = Segmentation.churnProbability(rfm);
    return {
      userId,
      risk,
      responsibleGaming: RiskScoring.responsibleGaming(behaviour),
      fraud: { score: fraud.score, band: fraud.band, signals: fraud.signals },
      segment,
      churnProbability: churn,
      retentionAction: Segmentation.retentionAction(segment, churn),
      behaviour,
      rfm,
    };
  }

  /** Fraction of losses followed by a larger bet (loss-chasing proxy). */
  private lossChasing(bets: number[]): number {
    if (bets.length < 3) return 0;
    let escalations = 0;
    let comparisons = 0;
    for (let i = 1; i < bets.length; i += 1) {
      comparisons += 1;
      if (bets[i]! > bets[i - 1]!) escalations += 1;
    }
    return comparisons ? Number((escalations / comparisons).toFixed(3)) : 0;
  }
}
