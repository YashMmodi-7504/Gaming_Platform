import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RewardType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { WalletEngineService } from '../../wallet-engine/services/wallet-engine.service';
import { BonusWalletService } from '../../wallet-engine/services/bonus-wallet.service';

/**
 * Reward catalog and claims over the existing `Reward`/`RewardClaim` models.
 * Cash and bonus rewards are paid through the Wallet Engine on claim; badges and
 * other virtual rewards are recorded as claimed.
 */
@Injectable()
export class RewardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletEngineService,
    private readonly bonus: BonusWalletService,
  ) {}

  listCatalog() {
    return this.prisma.reward.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  createReward(input: { slug: string; name: string; type: RewardType; value?: string; currencyCode?: string }) {
    return this.prisma.reward.create({
      data: {
        slug: input.slug,
        name: input.name,
        type: input.type,
        value: input.value,
        currencyCode: input.currencyCode,
      },
    });
  }

  myClaims(userId: string) {
    return this.prisma.rewardClaim.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Grant a reward to a user (creates a pending claim). */
  async grant(userId: string, rewardSlug: string) {
    const reward = await this.prisma.reward.findUnique({ where: { slug: rewardSlug } });
    if (!reward) throw new NotFoundException(`Reward "${rewardSlug}" not found`);
    return this.prisma.rewardClaim.create({ data: { userId, rewardId: reward.id, status: 'PENDING' } });
  }

  /** Claim a pending reward; cash/bonus rewards credit the wallet. */
  async claim(userId: string, claimId: string, currencyId?: string) {
    const claim = await this.prisma.rewardClaim.findFirst({ where: { id: claimId, userId }, include: { reward: true } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'PENDING') throw new BadRequestException('Reward already claimed');

    const amount = claim.reward.value?.toString() ?? '0';
    if (currencyId && Number(amount) > 0 && (claim.reward.type === RewardType.CASH || claim.reward.type === RewardType.CASHBACK)) {
      await this.wallet.credit(userId, currencyId, {
        amount,
        typeCode: claim.reward.type === RewardType.CASHBACK ? 'CASHBACK' : 'PROMOTION_REWARD',
        description: `Reward: ${claim.reward.name}`,
        idempotencyKey: `reward-claim:${claimId}`,
      });
    } else if (currencyId && Number(amount) > 0 && claim.reward.type === RewardType.BONUS) {
      await this.bonus.grant({ userId, currencyId, amount });
    }

    return this.prisma.rewardClaim.update({
      where: { id: claimId },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    });
  }
}
