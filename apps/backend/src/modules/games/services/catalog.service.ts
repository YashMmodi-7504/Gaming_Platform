import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type {
  GameDetail,
  GameSortOption,
  GameSummary,
  PaginatedResult,
} from '@gaming-platform/types';

import { type CatalogFilter, GameRepository } from '../repository/game.repository';
import { toGameDetail, toGameSummary } from '../game-mapper';
import { GameCacheService } from './game-cache.service';

const LIST_TTL = 60;
const DETAIL_TTL = 120;

export interface CatalogQuery {
  filter: CatalogFilter;
  page?: number;
  limit?: number;
  sort?: GameSortOption;
}

/**
 * Public read model for the catalog. Fully data-driven: filtering, sorting,
 * search, and pagination are all expressed through {@link GameRepository}.
 * Results are cached with epoch-based invalidation.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  async list(query: CatalogQuery): Promise<PaginatedResult<GameSummary>> {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const where = this.repository.buildWhere(query.filter);
    const orderBy = this.repository.buildOrderBy(query.sort);
    const cacheKey = this.fingerprint('list', query, page, limit);

    return this.cache.wrap(cacheKey, LIST_TTL, async () => {
      const [rows, total] = await Promise.all([
        this.repository.findMany({ where, orderBy, skip, take }),
        this.repository.count(where),
      ]);
      return buildPaginatedResult(rows.map(toGameSummary), total, page, limit);
    });
  }

  async getBySlug(slug: string): Promise<GameDetail> {
    const detail = await this.cache.wrap(['detail', slug], DETAIL_TTL, async () => {
      const game = await this.repository.findBySlug(slug);
      return game ? toGameDetail(game) : null;
    });
    if (!detail) {
      throw new NotFoundException(`Game "${slug}" not found`);
    }
    return detail;
  }

  async related(slug: string, limit = 12): Promise<GameSummary[]> {
    return this.cache.wrap(['related', slug, limit], LIST_TTL, async () => {
      const game = await this.repository.findBySlug(slug);
      if (!game) return [];
      const where = this.repository.buildWhere({ categoryId: game.categoryId });
      const rows = await this.repository.findMany({
        where: { AND: [where, { id: { not: game.id } }] },
        orderBy: this.repository.buildOrderBy('popular'),
        skip: 0,
        take: limit,
      });
      return rows.map(toGameSummary);
    });
  }

  private fingerprint(
    kind: string,
    query: CatalogQuery,
    page: number,
    limit: number,
  ): Array<string | number> {
    const f = query.filter;
    return [
      kind,
      query.sort ?? 'popular',
      page,
      limit,
      f.search ?? '',
      f.categorySlug ?? f.categoryId ?? '',
      f.providerCode ?? f.providerId ?? '',
      f.tag ?? '',
      f.device ?? '',
      f.language ?? '',
      f.currency ?? '',
      f.countryCode ?? '',
      f.ageRating ?? '',
      String(f.isNew ?? ''),
      String(f.isFeatured ?? ''),
      String(f.isTrending ?? ''),
      String(f.minRtp ?? ''),
    ];
  }
}
