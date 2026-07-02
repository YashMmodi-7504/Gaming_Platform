import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface TransactionView {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  createdAt: Date;
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

/**
 * Append-only transaction ledger access. Transactions are written exclusively by
 * {@link import('./wallet-engine.service').WalletEngineService}; this service is
 * read-only history with filtering and pagination.
 */
@Injectable()
export class WalletTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: TransactionQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where = {
      userId,
      ...(query.type ? { type: { code: query.type } } : {}),
      ...(query.status ? { status: { code: query.status } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: { type: true, status: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toView(r)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(userId: string, id: string): Promise<TransactionView> {
    const row = await this.prisma.walletTransaction.findFirst({
      where: { id, userId },
      include: { type: true, status: true },
    });
    if (!row) throw new NotFoundException('Transaction not found');
    return this.toView(row);
  }

  private toView(row: {
    id: string;
    reference: string;
    amount: { toString(): string };
    balanceAfter: { toString(): string };
    description: string | null;
    createdAt: Date;
    type: { code: string };
    status: { code: string };
  }): TransactionView {
    return {
      id: row.id,
      reference: row.reference,
      type: row.type.code,
      status: row.status.code,
      amount: row.amount.toString(),
      balanceAfter: row.balanceAfter.toString(),
      description: row.description,
      createdAt: row.createdAt,
    };
  }
}
