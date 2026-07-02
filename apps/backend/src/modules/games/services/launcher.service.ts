import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GameLauncherType, GameStatus, GameVisibility } from '@prisma/client';
import type { GameLaunchResolution } from '@gaming-platform/types';

import type { RequestMeta } from '../../../common/security/request-meta';
import { PrismaService } from '../../database/prisma.service';
import { toLaunchInfo } from '../game-mapper';
import { GameCacheService } from './game-cache.service';
import { RecentlyPlayedService } from './recently-played.service';

export interface ResolveLaunchOptions {
  userId?: string;
  countryCode?: string | null;
  device?: string;
  meta?: RequestMeta;
}

/**
 * The launcher resolves, from registry metadata alone, how to open a game and
 * whether the requesting context is allowed to. The platform contains no
 * game-specific code — a new game only needs metadata + a registered launcher.
 */
@Injectable()
export class LauncherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recentlyPlayed: RecentlyPlayedService,
    private readonly cache: GameCacheService,
  ) {}

  async resolve(slug: string, options: ResolveLaunchOptions = {}): Promise<GameLaunchResolution> {
    const game = await this.prisma.game.findFirst({
      where: { slug, deletedAt: null },
      include: { launcher: { select: { key: true, type: true, entryUrl: true } } },
    });
    if (!game) {
      throw new NotFoundException(`Game "${slug}" not found`);
    }

    const reason = this.availabilityReason(game, options);
    const launch = toLaunchInfo(game);
    const available = reason === null;

    if (available && options.userId) {
      await this.recordLaunch(options.userId, game.id, options.meta);
    }

    return { gameId: game.id, slug: game.slug, available, reason, launch };
  }

  private availabilityReason(
    game: {
      status: GameStatus;
      visibility: GameVisibility;
      maintenanceMode: boolean;
      geoAllow: string[];
      geoBlock: string[];
      supportedDevices: string[];
      availableFrom: Date | null;
      availableUntil: Date | null;
      publishedAt: Date | null;
    },
    options: ResolveLaunchOptions,
  ): string | null {
    const now = Date.now();
    if (game.status !== GameStatus.ACTIVE) return 'inactive';
    if (game.visibility === GameVisibility.PRIVATE) return 'private';
    if (game.maintenanceMode) return 'maintenance';
    if (game.publishedAt && game.publishedAt.getTime() > now) return 'not_published';
    if (game.availableFrom && game.availableFrom.getTime() > now) return 'not_yet_available';
    if (game.availableUntil && game.availableUntil.getTime() < now) return 'expired';

    const country = options.countryCode?.toUpperCase();
    if (country) {
      if (game.geoBlock.includes(country)) return 'geo_blocked';
      if (game.geoAllow.length > 0 && !game.geoAllow.includes(country)) return 'geo_restricted';
    }
    if (options.device && game.supportedDevices.length > 0 && !game.supportedDevices.includes(options.device)) {
      return 'device_unsupported';
    }
    return null;
  }

  private async recordLaunch(userId: string, gameId: string, meta?: RequestMeta): Promise<void> {
    await this.prisma.gameLaunchHistory.create({
      data: { userId, gameId, mode: 'real', ipAddress: meta?.ipAddress ?? null },
    });
    await this.recentlyPlayed.record(userId, gameId);
  }

  // ---- Admin: launcher registry -------------------------------------------

  listLaunchers() {
    return this.prisma.gameLauncher.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createLauncher(input: {
    key: string;
    name: string;
    type?: GameLauncherType;
    entryUrl?: string;
    description?: string;
  }) {
    const existing = await this.prisma.gameLauncher.findUnique({ where: { key: input.key } });
    if (existing) throw new ConflictException('A launcher with that key already exists');
    const launcher = await this.prisma.gameLauncher.create({
      data: {
        key: input.key,
        name: input.name,
        type: input.type ?? GameLauncherType.IFRAME,
        entryUrl: input.entryUrl,
        description: input.description,
      },
    });
    await this.cache.invalidate();
    return launcher;
  }

  async updateLauncher(
    id: string,
    input: {
      name?: string;
      type?: GameLauncherType;
      entryUrl?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const found = await this.prisma.gameLauncher.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Launcher not found');
    const launcher = await this.prisma.gameLauncher.update({ where: { id }, data: input });
    await this.cache.invalidate();
    return launcher;
  }

  async removeLauncher(id: string) {
    const found = await this.prisma.gameLauncher.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Launcher not found');
    await this.prisma.gameLauncher.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.cache.invalidate();
    return { success: true as const };
  }
}
