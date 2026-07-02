import { Injectable } from '@nestjs/common';
import { Money } from '@gaming-platform/wallet-core';

import { PrismaService } from '../../database/prisma.service';

/**
 * Financial reporting derived from the immutable transaction ledger: turnover,
 * wins, gross gaming revenue (house profit), RTP and cash flow. All figures come
 * from posted `WalletTransaction` rows grouped by type — never recomputed from
 * game state — so reports always reconcile with the ledger.
 */
@Injectable()
export class WalletReportingService {
  constructor(private readonly prisma: PrismaService) {}

  private async sumByType(code: string, since?: Date): Promise<string> {
    const type = await this.prisma.transactionType.findUnique({ where: { code }, select: { id: true } });
    if (!type) return '0';
    const result = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { typeId: type.id, ...(since ? { createdAt: { gte: since } } : {}) },
    });
    return result._sum.amount?.toString() ?? '0';
  }

  /** Headline gaming report for a trailing window (default 24h). */
  async overview(sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const [bets, wins, deposits, withdrawals, bonuses] = await Promise.all([
      this.sumByType('GAME_BET', since),
      this.sumByType('GAME_WIN', since),
      this.sumByType('DEPOSIT', since),
      this.sumByType('WITHDRAWAL', since),
      this.sumByType('BONUS_CREDIT', since),
    ]);
    const houseProfit = Money.sub(bets, wins);
    const playerProfit = Money.sub(wins, bets);
    const rtp = Money.isPositive(bets) ? Number(Money.mul(Money.of((Number(wins) / Number(bets)).toString()), '100')).toFixed(2) : '0';
    return {
      windowHours: sinceHours,
      bets,
      wins,
      deposits,
      withdrawals,
      bonuses,
      houseProfit,
      playerProfit,
      rtp: `${rtp}%`,
      cashFlow: Money.sub(deposits, withdrawals),
    };
  }

  /** Per-currency wallet statistics across the platform. */
  async walletStatistics() {
    const grouped = await this.prisma.walletBalance.aggregate({
      _sum: { available: true, locked: true, pending: true, total: true },
      _count: true,
    });
    return {
      wallets: grouped._count,
      available: grouped._sum.available?.toString() ?? '0',
      locked: grouped._sum.locked?.toString() ?? '0',
      pending: grouped._sum.pending?.toString() ?? '0',
      total: grouped._sum.total?.toString() ?? '0',
    };
  }
}
