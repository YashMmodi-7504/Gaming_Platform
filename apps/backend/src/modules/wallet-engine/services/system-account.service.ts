import { Injectable } from '@nestjs/common';
import type { Prisma } from '@gaming-platform/database';

import { PrismaService } from '../../database/prisma.service';

const SYSTEM_EMAIL = 'house@system.local';
const SYSTEM_USERNAME = 'house_account';

/**
 * Resolves the platform's system ("house") accounts. Every double-entry journal
 * needs a counterparty wallet; player movements are mirrored against a per-
 * currency house wallet owned by a single system user. The system user and its
 * wallets are created lazily and cached.
 */
@Injectable()
export class SystemAccountService {
  private systemUserId: string | null = null;
  private readonly houseWalletCache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  /** The system user that owns all house wallets. */
  async systemUser(tx?: Prisma.TransactionClient): Promise<string> {
    if (this.systemUserId) return this.systemUserId;
    const client = tx ?? this.prisma;
    const user = await client.user.upsert({
      where: { email: SYSTEM_EMAIL },
      update: {},
      create: { email: SYSTEM_EMAIL, username: SYSTEM_USERNAME, status: 'ACTIVE', emailVerified: true },
      select: { id: true },
    });
    this.systemUserId = user.id;
    return user.id;
  }

  /** The house wallet id for a currency (created on first use). */
  async houseWallet(currencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const cached = this.houseWalletCache.get(currencyId);
    if (cached) return cached;
    const client = tx ?? this.prisma;
    const userId = await this.systemUser(tx);
    const wallet = await client.wallet.upsert({
      where: { userId_currencyId_type: { userId, currencyId, type: 'CASH' } },
      update: {},
      create: {
        userId,
        currencyId,
        type: 'CASH',
        status: 'ACTIVE',
        balance: { create: { available: '0', locked: '0', pending: '0', total: '0' } },
      },
      select: { id: true },
    });
    this.houseWalletCache.set(currencyId, wallet.id);
    return wallet.id;
  }
}
