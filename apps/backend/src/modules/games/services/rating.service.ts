import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type { GameReviewSummary, PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameCacheService } from './game-cache.service';

@Injectable()
export class RatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: GameCacheService,
  ) {}

  /** Submit or update a 1–5 star rating, then recompute the game aggregate. */
  async rate(userId: string, gameId: string, value: number): Promise<{ average: number; count: number }> {
    if (value < 1 || value > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    await this.ensureGame(gameId);

    await this.prisma.gameRating.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: { rating: value },
      create: { userId, gameId, rating: value },
    });
    return this.recompute(gameId);
  }

  async review(
    userId: string,
    gameId: string,
    input: { rating?: number; title?: string; body: string },
  ) {
    await this.ensureGame(gameId);
    const review = await this.prisma.gameReview.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: { rating: input.rating, title: input.title, body: input.body },
      create: {
        userId,
        gameId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        status: ReviewStatus.PUBLISHED,
      },
    });
    if (input.rating) {
      await this.prisma.gameRating.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: { rating: input.rating },
        create: { userId, gameId, rating: input.rating },
      });
      await this.recompute(gameId);
    }
    return review;
  }

  async listReviews(
    gameId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<GameReviewSummary>> {
    const { page: p, limit: l, skip, take } = normalizePagination(page, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.gameReview.findMany({
        where: { gameId, status: ReviewStatus.PUBLISHED, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { username: true } } },
      }),
      this.prisma.gameReview.count({
        where: { gameId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      }),
    ]);

    const items = rows.map<GameReviewSummary>((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      helpfulCount: r.helpfulCount,
      author: r.user?.username ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    return buildPaginatedResult(items, total, p, l);
  }

  private async recompute(gameId: string): Promise<{ average: number; count: number }> {
    const agg = await this.prisma.gameRating.aggregate({
      where: { gameId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const average = Math.round((agg._avg.rating ?? 0) * 100) / 100;
    const count = agg._count._all;
    await this.prisma.game.update({
      where: { id: gameId },
      data: { ratingAverage: average, ratingCount: count },
    });
    await this.cache.invalidate();
    return { average, count };
  }

  private async ensureGame(gameId: string): Promise<void> {
    const game = await this.prisma.game.findFirst({ where: { id: gameId, deletedAt: null } });
    if (!game) throw new NotFoundException('Game not found');
  }
}
