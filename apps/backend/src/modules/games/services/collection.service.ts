import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type {
  GameCollectionSummary,
  GameSummary,
  PaginatedResult,
} from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameRepository } from '../repository/game.repository';
import { gameSummaryInclude, toGameSummary } from '../game-mapper';
import { GameCacheService } from './game-cache.service';
import { uniqueSlug } from './slug.util';

const LIST_TTL = 120;

@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  async list(featuredOnly = false): Promise<GameCollectionSummary[]> {
    return this.cache.wrap(['collections', String(featuredOnly)], LIST_TTL, async () => {
      const collections = await this.prisma.gameCollection.findMany({
        where: { deletedAt: null, isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) },
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { items: true } } },
      });
      return collections.map((c) => this.toSummary(c, c._count.items));
    });
  }

  async getBySlug(
    slug: string,
    page?: number,
    limit?: number,
  ): Promise<{ collection: GameCollectionSummary; games: PaginatedResult<GameSummary> }> {
    const collection = await this.prisma.gameCollection.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: { _count: { select: { items: true } } },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    const pagination = normalizePagination(page, limit);
    const items = await this.prisma.gameCollectionItem.findMany({
      where: { collectionId: collection.id },
      orderBy: { position: 'asc' },
      select: { gameId: true, position: true },
    });
    const order = new Map(items.map((i) => [i.gameId, i.position]));
    const ids = items.map((i) => i.gameId);

    const available = ids.length
      ? await this.prisma.game.findMany({
          where: { AND: [{ id: { in: ids } }, this.repository.buildWhere({})] },
          include: gameSummaryInclude,
        })
      : [];
    available.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const start = pagination.skip;
    const pageItems = available.slice(start, start + pagination.take).map(toGameSummary);
    return {
      collection: this.toSummary(collection, collection._count.items),
      games: buildPaginatedResult(pageItems, available.length, pagination.page, pagination.limit),
    };
  }

  // ---- Admin ---------------------------------------------------------------

  async create(input: {
    name: string;
    description?: string;
    coverUrl?: string;
    isFeatured?: boolean;
    displayOrder?: number;
  }) {
    const slug = await uniqueSlug(input.name, (s) =>
      this.prisma.gameCollection.findFirst({ where: { slug: s } }).then(Boolean),
    );
    const collection = await this.prisma.gameCollection.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        coverUrl: input.coverUrl,
        isFeatured: input.isFeatured ?? false,
        displayOrder: input.displayOrder ?? 0,
      },
    });
    await this.cache.invalidate();
    return collection;
  }

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      coverUrl?: string;
      isActive?: boolean;
      isFeatured?: boolean;
      displayOrder?: number;
    },
  ) {
    await this.ensureExists(id);
    const collection = await this.prisma.gameCollection.update({ where: { id }, data: input });
    await this.cache.invalidate();
    return collection;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.gameCollection.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.cache.invalidate();
    return { success: true as const };
  }

  async setGames(id: string, gameIds: string[]) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.gameCollectionItem.deleteMany({ where: { collectionId: id } }),
      this.prisma.gameCollectionItem.createMany({
        data: gameIds.map((gameId, index) => ({ collectionId: id, gameId, position: index })),
        skipDuplicates: true,
      }),
    ]);
    await this.cache.invalidate();
    return { success: true as const };
  }

  private toSummary(
    c: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      coverUrl: string | null;
      type: string;
      isFeatured: boolean;
    },
    gameCount: number,
  ): GameCollectionSummary {
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      coverUrl: c.coverUrl,
      type: c.type,
      isFeatured: c.isFeatured,
      gameCount,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.gameCollection.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Collection not found');
  }
}
