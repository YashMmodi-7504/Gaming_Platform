import { Injectable } from '@nestjs/common';
import { GameOutcome } from '@prisma/client';
import { FraudRules, type FraudFeatures } from '@gaming-platform/ai-core';

import { PrismaService } from '../../database/prisma.service';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/**
 * Fraud detection. Assembles behavioural/correlation features for an account
 * from logins, devices, game results and deposits, then runs the deterministic
 * ai-core rule engine. Every flag is explainable.
 */
@Injectable()
export class FraudService {
  constructor(private readonly prisma: PrismaService) {}

  async features(userId: string): Promise<FraudFeatures> {
    const now = Date.now();
    const [logins, devices, results, depositsLastHour, depositAgg, withdrawalAgg] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where: { userId, createdAt: { gte: new Date(now - 30 * 24 * HOUR) } },
        select: { ipAddress: true, createdAt: true },
        take: 500,
      }),
      this.prisma.device.findMany({ where: { userId, deletedAt: null }, select: { ipAddress: true } }),
      this.prisma.gameResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: { outcome: true, createdAt: true },
      }),
      this.prisma.depositRequest.count({ where: { userId, createdAt: { gte: new Date(now - HOUR) } } }),
      this.prisma.depositRequest.aggregate({ _sum: { amount: true }, where: { userId, status: 'COMPLETED' } }),
      this.prisma.withdrawalRequest.aggregate({ _sum: { amount: true }, where: { userId, status: 'COMPLETED' } }),
    ]);

    const userIps = [...new Set(logins.map((l) => l.ipAddress).filter((ip): ip is string => !!ip))];
    const deviceIps = [...new Set(devices.map((d) => d.ipAddress).filter((ip): ip is string => !!ip))];
    const distinctIpsLastHour = new Set(
      logins.filter((l) => l.createdAt.getTime() > now - HOUR).map((l) => l.ipAddress).filter(Boolean),
    ).size;

    const sharedIpAccounts = userIps.length
      ? await this.distinctOtherUsersByIp(userId, userIps, 'login')
      : [];
    const sharedDeviceAccounts = deviceIps.length
      ? await this.distinctOtherUsersByIp(userId, deviceIps, 'device')
      : [];

    const roundsPlayed = results.length;
    const wins = results.filter((r) => r.outcome === GameOutcome.WIN).length;
    const betsLastMinute = results.filter((r) => r.createdAt.getTime() > now - MINUTE).length;
    const intervalStdDev = this.intervalStdDev(results.map((r) => r.createdAt.getTime()));

    const deposits = Number(depositAgg._sum.amount ?? 0);
    const withdrawals = Number(withdrawalAgg._sum.amount ?? 0);

    return {
      accountId: userId,
      sharedDeviceAccounts,
      sharedIpAccounts,
      distinctDevices: devices.length,
      distinctIpsLastHour,
      betsLastMinute,
      winRate: roundsPlayed > 0 ? wins / roundsPlayed : 0,
      roundsPlayed,
      depositsLastHour,
      actionIntervalStdDevMs: intervalStdDev,
      withdrawalRatio: deposits > 0 ? Math.min(2, withdrawals / deposits) : 0,
    };
  }

  /** Full fraud assessment for a single account. */
  async assess(userId: string) {
    const features = await this.features(userId);
    return { userId, ...FraudRules.assess(features) };
  }

  /** Scan recently-active accounts and return those that are flagged. */
  async scan(limit = 50) {
    const recent = await this.prisma.gameSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { userId: true },
    });
    const userIds = [...new Set(recent.map((s) => s.userId))].slice(0, limit);
    const assessments = await Promise.all(userIds.map((id) => this.assess(id)));
    return assessments
      .filter((a) => a.band !== 'low')
      .sort((a, b) => b.score - a.score);
  }

  private async distinctOtherUsersByIp(userId: string, ips: string[], source: 'login' | 'device'): Promise<string[]> {
    if (source === 'device') {
      const rows = await this.prisma.device.findMany({
        where: { ipAddress: { in: ips }, userId: { not: userId }, deletedAt: null },
        select: { userId: true },
        take: 50,
      });
      return [...new Set(rows.map((r) => r.userId))];
    }
    const rows = await this.prisma.loginHistory.findMany({
      where: { ipAddress: { in: ips }, userId: { not: userId } },
      select: { userId: true },
      take: 200,
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private intervalStdDev(timestamps: number[]): number {
    if (timestamps.length < 3) return 1000;
    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) intervals.push(sorted[i]! - sorted[i - 1]!);
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    return Math.sqrt(variance);
  }
}
