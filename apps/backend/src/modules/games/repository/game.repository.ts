import { Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { GameStatus, GameVisibility } from '@prisma/client';
import type { GameSortOption } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import {
  gameDetailInclude,
  gameSummaryInclude,
} from '../game-mapper';

export interface CatalogFilter {
  search?: string;
  categorySlug?: string;
  categoryId?: string;
  providerCode?: string;
  providerId?: string;
  tag?: string;
  device?: string;
  language?: string;
  currency?: string;
  countryCode?: string;
  ageRating?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  minRtp?: number;
  /** Admin listings bypass the public availability constraints. */
  includeUnavailable?: boolean;
}

/**
 * Central, reusable query-building for the catalog. All visibility,
 * availability, and geo rules are expressed declaratively here — there is no
 * game-specific logic anywhere in the platform.
 */
@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Build a `where` clause that honors visibility, availability, and filters. */
  buildWhere(filter: CatalogFilter): Prisma.GameWhereInput {
    const and: Prisma.GameWhereInput[] = [{ deletedAt: null }];

    if (!filter.includeUnavailable) {
      const now = new Date();
      and.push(
        { status: GameStatus.ACTIVE },
        { visibility: GameVisibility.PUBLIC },
        { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
        { OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] },
      );
    }

    if (filter.search) {
      const term = filter.search.trim();
      and.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { tags: { some: { tag: { slug: { contains: term, mode: 'insensitive' } } } } },
          { provider: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (filter.categoryId) and.push({ categoryId: filter.categoryId });
    if (filter.categorySlug) and.push({ category: { slug: filter.categorySlug } });
    if (filter.providerId) and.push({ providerId: filter.providerId });
    if (filter.providerCode) and.push({ provider: { code: filter.providerCode } });
    if (filter.tag) and.push({ tags: { some: { tag: { slug: filter.tag } } } });
    if (filter.device) and.push({ supportedDevices: { has: filter.device } });
    if (filter.language) and.push({ supportedLanguages: { has: filter.language } });
    if (filter.currency) and.push({ supportedCurrencies: { has: filter.currency } });
    if (filter.ageRating) and.push({ ageRating: filter.ageRating as never });
    if (filter.isNew !== undefined) and.push({ isNew: filter.isNew });
    if (filter.isFeatured !== undefined) and.push({ isFeatured: filter.isFeatured });
    if (filter.isTrending !== undefined) and.push({ isTrending: filter.isTrending });
    if (filter.minRtp !== undefined) and.push({ rtp: { gte: filter.minRtp } });

    if (filter.countryCode) {
      const code = filter.countryCode.toUpperCase();
      and.push({ NOT: { geoBlock: { has: code } } });
      and.push({ OR: [{ geoAllow: { isEmpty: true } }, { geoAllow: { has: code } }] });
    }

    return { AND: and };
  }

  buildOrderBy(sort?: GameSortOption): Prisma.GameOrderByWithRelationInput[] {
    switch (sort) {
      case 'trending':
        return [{ isTrending: 'desc' }, { trendingScore: 'desc' }];
      case 'newest':
        return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
      case 'rating':
        return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }];
      case 'name':
        return [{ name: 'asc' }];
      case 'display':
        return [{ displayOrder: 'asc' }, { name: 'asc' }];
      case 'popular':
      default:
        return [{ popularityScore: 'desc' }, { name: 'asc' }];
    }
  }

  findMany(args: {
    where: Prisma.GameWhereInput;
    orderBy: Prisma.GameOrderByWithRelationInput[];
    skip: number;
    take: number;
  }) {
    return this.prisma.game.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      include: gameSummaryInclude,
    });
  }

  count(where: Prisma.GameWhereInput): Promise<number> {
    return this.prisma.game.count({ where });
  }

  findBySlug(slug: string, includeUnavailable = false) {
    return this.prisma.game.findFirst({
      where: { AND: [{ slug }, this.buildWhere({ includeUnavailable })] },
      include: gameDetailInclude,
    });
  }
}
