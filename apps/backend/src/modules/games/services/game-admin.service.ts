import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import {
  AgeRating,
  GameStatus,
  GameVisibility,
} from '@prisma/client';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type { GameSummary, PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameRepository } from '../repository/game.repository';
import { gameDetailInclude, gameSummaryInclude, toGameSummary } from '../game-mapper';
import { GameCacheService } from './game-cache.service';
import { assertValidSlug, uniqueSlug } from './slug.util';

export interface CreateGameInput {
  name: string;
  slug?: string;
  description?: string;
  categoryId: string;
  providerId: string;
  launcherId?: string;
  currencyId?: string;
  status?: GameStatus;
  visibility?: GameVisibility;
  ageRating?: AgeRating;
  thumbnailUrl?: string;
  bannerUrl?: string;
  minBet?: number;
  maxBet?: number;
  rtp?: number;
  volatility?: string;
  tags?: string[];
  supportedDevices?: string[];
  supportedLanguages?: string[];
  supportedCurrencies?: string[];
  geoAllow?: string[];
  geoBlock?: string[];
  launchUrl?: string;
  deepLink?: string;
  routePath?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  isFeatured?: boolean;
  isNew?: boolean;
  releaseNotes?: string;
}

export type UpdateGameInput = Partial<CreateGameInput>;

/** Plain scalar fields shared by create and update (no field-operation wrappers). */
interface GameScalarData {
  thumbnailUrl?: string;
  bannerUrl?: string;
  minBet?: number;
  maxBet?: number;
  rtp?: number;
  volatility?: string;
  supportedDevices?: string[];
  supportedLanguages?: string[];
  supportedCurrencies?: string[];
  geoAllow?: string[];
  geoBlock?: string[];
  launchUrl?: string;
  deepLink?: string;
  routePath?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  isFeatured?: boolean;
  isNew?: boolean;
  releaseNotes?: string;
}

@Injectable()
export class GameAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: GameStatus;
    categorySlug?: string;
    providerCode?: string;
  }): Promise<PaginatedResult<GameSummary>> {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const base = this.repository.buildWhere({
      includeUnavailable: true,
      search: query.search,
      categorySlug: query.categorySlug,
      providerCode: query.providerCode,
    });
    const where: Prisma.GameWhereInput = {
      AND: [base, ...(query.status ? [{ status: query.status }] : [])],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: gameSummaryInclude,
      }),
      this.prisma.game.count({ where }),
    ]);
    return buildPaginatedResult(rows.map(toGameSummary), total, page, limit);
  }

  async get(id: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, deletedAt: null },
      include: gameDetailInclude,
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async create(input: CreateGameInput) {
    const slug = input.slug
      ? (assertValidSlug(input.slug), await this.assertSlugFree(input.slug))
      : await uniqueSlug(input.name, (s) =>
          this.prisma.game.findFirst({ where: { slug: s } }).then(Boolean),
        );

    const game = await this.prisma.game.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        category: { connect: { id: input.categoryId } },
        provider: { connect: { id: input.providerId } },
        ...(input.launcherId ? { launcher: { connect: { id: input.launcherId } } } : {}),
        ...(input.currencyId ? { currency: { connect: { id: input.currencyId } } } : {}),
        status: input.status ?? GameStatus.DRAFT,
        visibility: input.visibility ?? GameVisibility.PUBLIC,
        ageRating: input.ageRating ?? AgeRating.EVERYONE,
        ...this.scalarData(input),
      },
    });

    if (input.tags?.length) {
      await this.syncTags(game.id, input.tags);
    }
    await this.cache.invalidate();
    return this.get(game.id);
  }

  async update(id: string, input: UpdateGameInput) {
    await this.ensureExists(id);
    if (input.slug) {
      assertValidSlug(input.slug);
      await this.assertSlugFree(input.slug, id);
    }

    await this.prisma.game.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
        ...(input.providerId ? { provider: { connect: { id: input.providerId } } } : {}),
        ...(input.launcherId ? { launcher: { connect: { id: input.launcherId } } } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.visibility ? { visibility: input.visibility } : {}),
        ...(input.ageRating ? { ageRating: input.ageRating } : {}),
        ...this.scalarData(input),
      },
    });

    if (input.tags) {
      await this.syncTags(id, input.tags);
    }
    await this.cache.invalidate();
    return this.get(id);
  }

  async setStatus(id: string, status: GameStatus) {
    await this.ensureExists(id);
    const data: Prisma.GameUpdateInput = { status };
    if (status === GameStatus.ACTIVE) data.publishedAt = new Date();
    const game = await this.prisma.game.update({ where: { id }, data });
    await this.cache.invalidate();
    return game;
  }

  async setVisibility(id: string, visibility: GameVisibility) {
    return this.patch(id, { visibility });
  }

  async setFlags(id: string, flags: { isFeatured?: boolean; isNew?: boolean }) {
    return this.patch(id, flags);
  }

  async setTrending(id: string, isTrending: boolean, trendingScore?: number) {
    return this.patch(id, { isTrending, ...(trendingScore !== undefined ? { trendingScore } : {}) });
  }

  async setMaintenance(id: string, enabled: boolean, message?: string) {
    return this.patch(id, { maintenanceMode: enabled, maintenanceMessage: message ?? null });
  }

  async schedule(
    id: string,
    schedule: { publishedAt?: string; availableFrom?: string; availableUntil?: string },
  ) {
    return this.patch(id, {
      publishedAt: schedule.publishedAt ? new Date(schedule.publishedAt) : undefined,
      availableFrom: schedule.availableFrom ? new Date(schedule.availableFrom) : undefined,
      availableUntil: schedule.availableUntil ? new Date(schedule.availableUntil) : undefined,
    });
  }

  async reorder(items: Array<{ id: string; displayOrder: number }>) {
    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.game.update({ where: { id: i.id }, data: { displayOrder: i.displayOrder } }),
      ),
    );
    await this.cache.invalidate();
    return { success: true as const };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.game.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.cache.invalidate();
    return { success: true as const };
  }

  // ---- Versions ------------------------------------------------------------

  listVersions(gameId: string) {
    return this.prisma.gameVersion.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addVersion(
    gameId: string,
    input: { version: string; changelog?: string; releaseUrl?: string; isCurrent?: boolean },
  ) {
    await this.ensureExists(gameId);
    if (input.isCurrent) {
      await this.prisma.gameVersion.updateMany({ where: { gameId }, data: { isCurrent: false } });
    }
    const version = await this.prisma.gameVersion.create({
      data: {
        gameId,
        version: input.version,
        changelog: input.changelog,
        releaseUrl: input.releaseUrl,
        isCurrent: input.isCurrent ?? false,
        releasedAt: input.isCurrent ? new Date() : null,
      },
    });
    await this.cache.invalidate();
    return version;
  }

  // ---- Statistics ----------------------------------------------------------

  async statistics() {
    const [total, byStatus, providers, categories, collections, featured, maintenance] =
      await Promise.all([
        this.prisma.game.count({ where: { deletedAt: null } }),
        this.prisma.game.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.gameProvider.count({ where: { deletedAt: null } }),
        this.prisma.gameCategory.count({ where: { deletedAt: null } }),
        this.prisma.gameCollection.count({ where: { deletedAt: null } }),
        this.prisma.game.count({ where: { deletedAt: null, isFeatured: true } }),
        this.prisma.game.count({ where: { deletedAt: null, maintenanceMode: true } }),
      ]);

    return {
      totalGames: total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      providers,
      categories,
      collections,
      featured,
      inMaintenance: maintenance,
    };
  }

  // ---- internals -----------------------------------------------------------

  private async patch(id: string, data: Prisma.GameUpdateInput) {
    await this.ensureExists(id);
    const game = await this.prisma.game.update({ where: { id }, data });
    await this.cache.invalidate();
    return game;
  }

  private scalarData(input: UpdateGameInput): GameScalarData {
    const data: GameScalarData = {};
    if (input.thumbnailUrl !== undefined) data.thumbnailUrl = input.thumbnailUrl;
    if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;
    if (input.minBet !== undefined) data.minBet = input.minBet;
    if (input.maxBet !== undefined) data.maxBet = input.maxBet;
    if (input.rtp !== undefined) data.rtp = input.rtp;
    if (input.volatility !== undefined) data.volatility = input.volatility;
    if (input.supportedDevices !== undefined) data.supportedDevices = input.supportedDevices;
    if (input.supportedLanguages !== undefined) data.supportedLanguages = input.supportedLanguages;
    if (input.supportedCurrencies !== undefined) data.supportedCurrencies = input.supportedCurrencies;
    if (input.geoAllow !== undefined) data.geoAllow = input.geoAllow;
    if (input.geoBlock !== undefined) data.geoBlock = input.geoBlock;
    if (input.launchUrl !== undefined) data.launchUrl = input.launchUrl;
    if (input.deepLink !== undefined) data.deepLink = input.deepLink;
    if (input.routePath !== undefined) data.routePath = input.routePath;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle;
    if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription;
    if (input.seoKeywords !== undefined) data.seoKeywords = input.seoKeywords;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.isNew !== undefined) data.isNew = input.isNew;
    if (input.releaseNotes !== undefined) data.releaseNotes = input.releaseNotes;
    return data;
  }

  private async syncTags(gameId: string, slugs: string[]): Promise<void> {
    const tags = await Promise.all(
      slugs.map((slug) =>
        this.prisma.gameTag.upsert({
          where: { slug },
          update: {},
          create: { slug, name: slug },
        }),
      ),
    );
    await this.prisma.gameTagMapping.deleteMany({ where: { gameId } });
    await this.prisma.gameTagMapping.createMany({
      data: tags.map((t) => ({ gameId, tagId: t.id })),
      skipDuplicates: true,
    });
  }

  private async assertSlugFree(slug: string, exceptId?: string): Promise<string> {
    const existing = await this.prisma.game.findFirst({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('A game with that slug already exists');
    }
    return slug;
  }

  private async ensureExists(id: string): Promise<void> {
    const game = await this.prisma.game.findFirst({ where: { id, deletedAt: null } });
    if (!game) throw new NotFoundException('Game not found');
  }
}
