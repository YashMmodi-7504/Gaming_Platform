import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type { GameSummary, PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { gameSummaryInclude, toGameSummary } from '../game-mapper';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toggle a favorite, returning the resulting state. */
  async toggle(userId: string, gameId: string): Promise<{ favorited: boolean }> {
    const game = await this.prisma.game.findFirst({ where: { id: gameId, deletedAt: null } });
    if (!game) throw new NotFoundException('Game not found');

    const existing = await this.prisma.gameFavourite.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (existing) {
      await this.prisma.gameFavourite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.gameFavourite.create({ data: { userId, gameId } });
    return { favorited: true };
  }

  async list(userId: string, page?: number, limit?: number): Promise<PaginatedResult<GameSummary>> {
    const { page: p, limit: l, skip, take } = normalizePagination(page, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.gameFavourite.findMany({
        where: { userId, game: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { game: { include: gameSummaryInclude } },
      }),
      this.prisma.gameFavourite.count({ where: { userId, game: { deletedAt: null } } }),
    ]);
    return buildPaginatedResult(rows.map((f) => toGameSummary(f.game)), total, p, l);
  }

  async ids(userId: string): Promise<string[]> {
    const rows = await this.prisma.gameFavourite.findMany({
      where: { userId },
      select: { gameId: true },
    });
    return rows.map((r) => r.gameId);
  }
}
