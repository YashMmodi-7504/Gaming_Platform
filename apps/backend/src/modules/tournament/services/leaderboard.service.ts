import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { LeaderboardPeriod } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TournamentGateway } from '../tournament.gateway';

/**
 * Leaderboards over the existing `Leaderboard`/`LeaderboardEntry` models with a
 * Redis sorted-set fast path for live top-N reads. Supports global, game-specific
 * and periodic (daily/weekly/monthly/season) boards.
 */
@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: TournamentGateway,
  ) {}

  list(period?: LeaderboardPeriod) {
    return this.prisma.leaderboard.findMany({
      where: { isActive: true, ...(period ? { period } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: { name: string; metric?: string; period?: LeaderboardPeriod; gameId?: string }) {
    return this.prisma.leaderboard.create({
      data: {
        name: input.name,
        metric: input.metric ?? 'score',
        period: input.period ?? LeaderboardPeriod.ALL_TIME,
        gameId: input.gameId,
      },
    });
  }

  /** Top-N entries: served from Redis if warm, otherwise from Postgres. */
  async top(leaderboardId: string, limit = 100) {
    const key = this.zkey(leaderboardId);
    const cached = await this.redis.raw.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    if (cached.length > 0) {
      const out: Array<{ userId: string; score: number; rank: number }> = [];
      for (let i = 0; i < cached.length; i += 2) {
        out.push({ userId: cached[i]!, score: Number(cached[i + 1]), rank: i / 2 + 1 });
      }
      return out;
    }
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { leaderboardId },
      orderBy: { rank: 'asc' },
      take: limit,
    });
    return entries.map((e) => ({ userId: e.userId, score: Number(e.score), rank: e.rank }));
  }

  /** Submit/replace a user's best score and recompute ranks. */
  async submit(leaderboardId: string, userId: string, score: number) {
    const board = await this.prisma.leaderboard.findUnique({ where: { id: leaderboardId } });
    if (!board) throw new NotFoundException('Leaderboard not found');

    await this.redis.raw.zadd(this.zkey(leaderboardId), score, userId);
    await this.prisma.leaderboardEntry.upsert({
      where: { leaderboardId_userId: { leaderboardId, userId } },
      update: { score: score.toString(), rank: 0 },
      create: { leaderboardId, userId, score: score.toString(), rank: 0 },
    });
    await this.recomputeRanks(leaderboardId);
    const top = await this.top(leaderboardId, 50);
    this.gateway.emitLeaderboard(leaderboardId, top);
    return top;
  }

  /** Recompute dense ranks from current scores (called after each submit). */
  async recomputeRanks(leaderboardId: string): Promise<void> {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { leaderboardId },
      orderBy: { score: 'desc' },
      select: { id: true, score: true },
    });
    let rank = 0;
    let lastScore: string | null = null;
    const updates: Prisma.PrismaPromise<unknown>[] = [];
    entries.forEach((e, index) => {
      const s = e.score.toString();
      if (s !== lastScore) rank = index + 1;
      lastScore = s;
      updates.push(this.prisma.leaderboardEntry.update({ where: { id: e.id }, data: { rank } }));
    });
    if (updates.length > 0) await this.prisma.$transaction(updates);
  }

  private zkey(id: string): string {
    return `leaderboard:${id}`;
  }
}
