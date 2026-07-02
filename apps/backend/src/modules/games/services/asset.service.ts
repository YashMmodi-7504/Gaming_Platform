import { Injectable, NotFoundException } from '@nestjs/common';
import { GameAssetType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GameCacheService } from './game-cache.service';

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: GameCacheService,
  ) {}

  list(gameId: string) {
    return this.prisma.gameAsset.findMany({
      where: { gameId },
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async add(
    gameId: string,
    input: { type: GameAssetType; url: string; locale?: string; displayOrder?: number; storageKey?: string },
  ) {
    await this.ensureGame(gameId);
    const asset = await this.prisma.gameAsset.create({
      data: {
        gameId,
        type: input.type,
        url: input.url,
        locale: input.locale,
        storageKey: input.storageKey,
        displayOrder: input.displayOrder ?? 0,
      },
    });
    await this.cache.invalidate();
    return asset;
  }

  async remove(gameId: string, assetId: string) {
    const asset = await this.prisma.gameAsset.findFirst({ where: { id: assetId, gameId } });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.prisma.gameAsset.delete({ where: { id: assetId } });
    await this.cache.invalidate();
    return { success: true as const };
  }

  async reorder(gameId: string, items: Array<{ id: string; displayOrder: number }>) {
    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.gameAsset.updateMany({
          where: { id: i.id, gameId },
          data: { displayOrder: i.displayOrder },
        }),
      ),
    );
    await this.cache.invalidate();
    return { success: true as const };
  }

  private async ensureGame(gameId: string): Promise<void> {
    const game = await this.prisma.game.findFirst({ where: { id: gameId, deletedAt: null } });
    if (!game) throw new NotFoundException('Game not found');
  }
}
