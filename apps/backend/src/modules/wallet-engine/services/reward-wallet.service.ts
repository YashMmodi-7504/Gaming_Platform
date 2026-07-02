import { BadRequestException, Injectable } from '@nestjs/common';
import { Money } from '@gaming-platform/wallet-core';

import { PrismaService } from '../../database/prisma.service';

/**
 * Reward (loyalty points) wallet. Points accrue from play and can be redeemed;
 * a single reward wallet per user holds the points balance and tier multiplier.
 */
@Injectable()
export class RewardWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const existing = await this.prisma.rewardWallet.findFirst({ where: { userId, deletedAt: null } });
    if (existing) return existing;
    return this.prisma.rewardWallet.create({ data: { userId, pointsBalance: '0', tierMultiplier: '1' } });
  }

  /** Earn loyalty points (scaled by the tier multiplier). */
  async earn(userId: string, points: string) {
    const wallet = await this.get(userId);
    const credited = Money.mul(points, wallet.tierMultiplier.toString());
    return this.prisma.rewardWallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: Money.add(wallet.pointsBalance.toString(), credited) },
    });
  }

  /** Redeem loyalty points. */
  async redeem(userId: string, points: string) {
    const wallet = await this.get(userId);
    if (Money.lt(wallet.pointsBalance.toString(), points)) {
      throw new BadRequestException('Insufficient reward points');
    }
    return this.prisma.rewardWallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: Money.sub(wallet.pointsBalance.toString(), points) },
    });
  }
}
