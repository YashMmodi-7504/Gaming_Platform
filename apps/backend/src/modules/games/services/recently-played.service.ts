import { Injectable } from '@nestjs/common';
import type { GameSummary } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { gameSummaryInclude, toGameSummary } from '../game-mapper';

@Injectable()
export class RecentlyPlayedService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record a play, bumping the recency entry and the game's play counters. */
  async record(userId: string, gameId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.recentlyPlayed.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: { playCount: { increment: 1 }, lastPlayedAt: new Date() },
        create: { userId, gameId, playCount: 1, lastPlayedAt: new Date() },
      }),
      this.prisma.game.update({
        where: { id: gameId },
        data: { playCount: { increment: 1 }, popularityScore: { increment: 1 } },
      }),
    ]);
  }

  async list(userId: string, limit = 12): Promise<GameSummary[]> {
    const rows = await this.prisma.recentlyPlayed.findMany({
      where: { userId, game: { deletedAt: null } },
      orderBy: { lastPlayedAt: 'desc' },
      take: limit,
      include: { game: { include: gameSummaryInclude } },
    });
    return rows.map((r) => toGameSummary(r.game));
  }
}
