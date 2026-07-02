import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Money } from '@gaming-platform/wallet-core';
import { WalletType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { WalletEngineService } from './wallet-engine.service';

/**
 * Bonus wallet management: granting promotional credit, tracking wagering
 * progress and converting cleared bonuses into real, withdrawable funds via the
 * engine (never by direct balance writes).
 */
@Injectable()
export class BonusWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WalletEngineService,
  ) {}

  list(userId: string) {
    return this.prisma.bonusWallet.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Grant a bonus with an optional wagering requirement. */
  grant(input: {
    userId: string;
    currencyId: string;
    amount: string;
    wageringRequirement?: string;
    sourcePromotionId?: string;
    expiresAt?: Date;
  }) {
    return this.prisma.bonusWallet.create({
      data: {
        userId: input.userId,
        currencyId: input.currencyId,
        balance: input.amount,
        wageringRequirement: input.wageringRequirement ?? '0',
        wageringProgress: '0',
        sourcePromotionId: input.sourcePromotionId,
        expiresAt: input.expiresAt,
      },
    });
  }

  /** Record wagering progress toward clearing a bonus. */
  async addWagering(bonusWalletId: string, amount: string) {
    const bonus = await this.prisma.bonusWallet.findUnique({ where: { id: bonusWalletId } });
    if (!bonus) throw new NotFoundException('Bonus wallet not found');
    const progress = Money.add(bonus.wageringProgress.toString(), amount);
    return this.prisma.bonusWallet.update({
      where: { id: bonusWalletId },
      data: { wageringProgress: progress },
    });
  }

  /** Convert a fully-wagered bonus into the main wallet. */
  async convert(userId: string, bonusWalletId: string) {
    const bonus = await this.prisma.bonusWallet.findFirst({ where: { id: bonusWalletId, userId } });
    if (!bonus) throw new NotFoundException('Bonus wallet not found');
    if (Money.lt(bonus.wageringProgress.toString(), bonus.wageringRequirement.toString())) {
      throw new BadRequestException('Wagering requirement not met');
    }
    const amount = bonus.balance.toString();
    if (!Money.isPositive(amount)) throw new BadRequestException('No bonus balance to convert');

    await this.prisma.bonusWallet.update({
      where: { id: bonusWalletId },
      data: { balance: '0', status: 'CLOSED' },
    });
    const result = await this.engine.credit(userId, bonus.currencyId, {
      amount,
      typeCode: 'BONUS_CREDIT',
      description: 'Bonus converted to main wallet',
      idempotencyKey: `bonus-convert:${bonusWalletId}`,
    }, WalletType.MAIN);
    return { converted: amount, wallet: result.wallet };
  }
}
