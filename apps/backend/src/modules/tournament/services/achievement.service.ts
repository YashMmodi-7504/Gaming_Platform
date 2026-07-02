import { Injectable, NotFoundException } from '@nestjs/common';
import { AchievementType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

interface AchievementCriteria {
  target?: number;
}

/**
 * Achievements & badges over the existing `Achievement`/`UserAchievement`
 * models. Progress accumulates toward a criteria target; reaching it unlocks the
 * achievement (and its points/badge).
 */
@Injectable()
export class AchievementService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return this.prisma.achievement.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { points: 'desc' } });
  }

  create(input: { slug: string; name: string; type?: AchievementType; points?: number; target?: number; iconUrl?: string }) {
    return this.prisma.achievement.create({
      data: {
        slug: input.slug,
        name: input.name,
        type: input.type ?? AchievementType.MILESTONE,
        points: input.points ?? 0,
        iconUrl: input.iconUrl,
        criteria: { target: input.target ?? 1 },
      },
    });
  }

  async forUser(userId: string) {
    const [catalog, unlocked] = await Promise.all([
      this.catalog(),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);
    const byId = new Map(unlocked.map((u) => [u.achievementId, u]));
    return catalog.map((a) => {
      const record = byId.get(a.id);
      const target = ((a.criteria as AchievementCriteria | null)?.target ?? 1) || 1;
      return {
        id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        type: a.type,
        points: a.points,
        iconUrl: a.iconUrl,
        progress: record?.progress ?? 0,
        target,
        unlocked: record?.isUnlocked ?? false,
        unlockedAt: record?.unlockedAt ?? null,
      };
    });
  }

  /** Advance a user's progress on an achievement; unlock when target reached. */
  async recordProgress(userId: string, slug: string, amount = 1) {
    const achievement = await this.prisma.achievement.findUnique({ where: { slug } });
    if (!achievement) throw new NotFoundException(`Achievement "${slug}" not found`);
    const target = ((achievement.criteria as AchievementCriteria | null)?.target ?? 1) || 1;

    const existing = await this.prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    const progress = (existing?.progress ?? 0) + amount;
    const isUnlocked = progress >= target;

    return this.prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: { progress, isUnlocked, unlockedAt: isUnlocked && !existing?.isUnlocked ? new Date() : existing?.unlockedAt },
      create: { userId, achievementId: achievement.id, progress, isUnlocked, unlockedAt: isUnlocked ? new Date() : null },
    });
  }
}
