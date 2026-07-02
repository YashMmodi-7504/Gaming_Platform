import { Injectable } from '@nestjs/common';
import type { GameSortOption, GameSummary } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameRepository } from '../repository/game.repository';
import { gameSummaryInclude, toGameSummary } from '../game-mapper';
import { GameCacheService } from './game-cache.service';

const SHELF_TTL = 60;

/**
 * Discovery shelves (featured / trending / popular / recently-added) and a
 * personalized recommendation feed derived from the user's play history. None
 * of this is game-specific — it ranks metadata.
 */
@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  featured(limit = 12): Promise<GameSummary[]> {
    return this.shelf('featured', { isFeatured: true }, 'display', limit);
  }

  trending(limit = 12): Promise<GameSummary[]> {
    return this.shelf('trending', { isTrending: true }, 'trending', limit);
  }

  popular(limit = 12): Promise<GameSummary[]> {
    return this.shelf('popular', {}, 'popular', limit);
  }

  recentlyAdded(limit = 12): Promise<GameSummary[]> {
    return this.shelf('recent', {}, 'newest', limit);
  }

  /** Personalized: popular games in the user's most-played categories. */
  async recommended(userId: string, limit = 12): Promise<GameSummary[]> {
    const history = await this.prisma.recentlyPlayed.findMany({
      where: { userId },
      orderBy: { lastPlayedAt: 'desc' },
      take: 25,
      include: { game: { select: { categoryId: true } } },
    });

    if (history.length === 0) {
      return this.popular(limit);
    }

    const categoryIds = [...new Set(history.map((h) => h.game.categoryId))];
    const playedIds = history.map((h) => h.gameId);
    const rows = await this.prisma.game.findMany({
      where: {
        AND: [
          this.repository.buildWhere({}),
          { categoryId: { in: categoryIds } },
          { id: { notIn: playedIds } },
        ],
      },
      orderBy: this.repository.buildOrderBy('popular'),
      take: limit,
      include: gameSummaryInclude,
    });

    return rows.length > 0 ? rows.map(toGameSummary) : this.popular(limit);
  }

  private shelf(
    key: string,
    filter: Parameters<GameRepository['buildWhere']>[0],
    sort: GameSortOption,
    limit: number,
  ): Promise<GameSummary[]> {
    return this.cache.wrap(['shelf', key, limit], SHELF_TTL, async () => {
      const rows = await this.repository.findMany({
        where: this.repository.buildWhere(filter),
        orderBy: this.repository.buildOrderBy(sort),
        skip: 0,
        take: limit,
      });
      return rows.map(toGameSummary);
    });
  }
}
