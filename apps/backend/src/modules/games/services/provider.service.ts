import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderStatus } from '@prisma/client';
import type { GameProviderSummary } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameRepository } from '../repository/game.repository';
import { GameCacheService } from './game-cache.service';
import { uniqueSlug } from './slug.util';

const LIST_TTL = 300;

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  async list(): Promise<GameProviderSummary[]> {
    return this.cache.wrap(['providers'], LIST_TTL, async () => {
      const [providers, counts] = await Promise.all([
        this.prisma.gameProvider.findMany({
          where: { deletedAt: null, status: ProviderStatus.ACTIVE },
          orderBy: { name: 'asc' },
        }),
        this.prisma.game.groupBy({
          by: ['providerId'],
          where: this.repository.buildWhere({}),
          _count: { _all: true },
        }),
      ]);
      const countByProvider = new Map(counts.map((c) => [c.providerId, c._count._all]));
      return providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        logoUrl: p.logoUrl,
        status: p.status,
        gameCount: countByProvider.get(p.id) ?? 0,
      }));
    });
  }

  async getByCode(code: string) {
    const provider = await this.prisma.gameProvider.findFirst({
      where: { code, deletedAt: null },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  // ---- Admin ---------------------------------------------------------------

  async create(input: { name: string; code?: string; website?: string; logoUrl?: string }) {
    const code =
      input.code ??
      (await uniqueSlug(input.name, (s) =>
        this.prisma.gameProvider.findFirst({ where: { code: s } }).then(Boolean),
      ));
    const provider = await this.prisma.gameProvider.create({
      data: { name: input.name, code, website: input.website, logoUrl: input.logoUrl },
    });
    await this.cache.invalidate();
    return provider;
  }

  async update(
    id: string,
    input: {
      name?: string;
      website?: string;
      logoUrl?: string;
      status?: ProviderStatus;
    },
  ) {
    const found = await this.prisma.gameProvider.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Provider not found');
    const provider = await this.prisma.gameProvider.update({ where: { id }, data: input });
    await this.cache.invalidate();
    return provider;
  }

  async remove(id: string) {
    const found = await this.prisma.gameProvider.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Provider not found');
    await this.prisma.gameProvider.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.cache.invalidate();
    return { success: true as const };
  }
}
