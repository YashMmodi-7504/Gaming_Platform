import { Injectable } from '@nestjs/common';
import { Money } from '@gaming-platform/wallet-core';

import { PrismaService } from '../../database/prisma.service';

/**
 * Read & reconciliation access to the double-entry ledger. Entries are posted by
 * the engine; this service exposes inspection and the trial-balance check that
 * proves the books are balanced (Σ debits = Σ credits).
 */
@Injectable()
export class WalletLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async entriesForWallet(walletId: string, limit = 100) {
    return this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { ledger: true },
    });
  }

  async recentLedgers(limit = 100) {
    return this.prisma.ledger.findMany({
      orderBy: { postedAt: 'desc' },
      take: limit,
      include: { entries: true },
    });
  }

  /** Trial balance: total debits vs credits across all posted entries. */
  async reconcile() {
    const grouped = await this.prisma.ledgerEntry.groupBy({
      by: ['direction'],
      where: { status: 'POSTED' },
      _sum: { amount: true },
    });
    let debit = '0';
    let credit = '0';
    for (const row of grouped) {
      const sum = row._sum.amount?.toString() ?? '0';
      if (row.direction === 'DEBIT') debit = sum;
      else credit = sum;
    }
    return { debit, credit, balanced: Money.eq(debit, credit), difference: Money.sub(debit, credit) };
  }
}
