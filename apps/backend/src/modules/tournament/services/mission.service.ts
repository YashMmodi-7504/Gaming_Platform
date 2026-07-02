import { Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { Levels, Missions, type MissionDefinition, type MissionProgress } from '@gaming-platform/tournament-core';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

const SCOPE = 'mission';
const ENV = 'production';

interface UserMissionState {
  progress: Record<string, MissionProgress>;
  xp: number;
}

/**
 * Missions & progression. Mission definitions are configuration
 * (`ApplicationSetting`, scope `mission`); per-user progress and XP live in
 * Redis for fast updates. Progress is advanced by the pure `Missions` evaluator,
 * and completion grants XP/levels via the `Levels` curve.
 */
@Injectable()
export class MissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async definitions(): Promise<MissionDefinition[]> {
    const rows = await this.prisma.applicationSetting.findMany({ where: { scope: SCOPE, environment: ENV } });
    return rows.map((r) => r.value as unknown as MissionDefinition);
  }

  async upsertDefinition(def: MissionDefinition): Promise<MissionDefinition> {
    await this.prisma.applicationSetting.upsert({
      where: { scope_key_environment: { scope: SCOPE, key: def.id, environment: ENV } },
      update: { value: def as unknown as Prisma.InputJsonValue },
      create: { scope: SCOPE, key: def.id, environment: ENV, valueType: 'JSON', value: def as unknown as Prisma.InputJsonValue },
    });
    return def;
  }

  async removeDefinition(id: string): Promise<{ success: true }> {
    await this.prisma.applicationSetting
      .delete({ where: { scope_key_environment: { scope: SCOPE, key: id, environment: ENV } } })
      .catch(() => undefined);
    return { success: true };
  }

  /** A user's missions with live progress and current XP/level. */
  async forUser(userId: string) {
    const [defs, state] = await Promise.all([this.definitions(), this.loadState(userId)]);
    const level = Levels.progress(state.xp);
    return {
      xp: state.xp,
      level: level.level,
      levelProgress: { into: level.into, needed: level.needed },
      missions: defs.map((def) => {
        const progress = state.progress[def.id] ?? { missionId: def.id, value: 0, completed: false };
        return {
          id: def.id,
          name: def.name,
          window: def.window,
          metric: def.metric,
          target: def.target,
          xp: def.xp,
          value: progress.value,
          completed: progress.completed,
          percent: Missions.percent(def, progress),
        };
      }),
    };
  }

  /** Record a gameplay event, advancing all matching missions and granting XP. */
  async recordEvent(userId: string, metric: string, amount = 1) {
    const defs = await this.definitions();
    const state = await this.loadState(userId);
    const progressMap = new Map(Object.entries(state.progress));
    const before = new Map([...progressMap].map(([k, v]) => [k, v.completed]));

    const next = Missions.applyAll(defs, progressMap, { metric, amount });
    let xpGain = 0;
    for (const def of defs) {
      const p = next.get(def.id);
      if (p?.completed && !before.get(def.id)) xpGain += def.xp;
    }
    const newState: UserMissionState = {
      progress: Object.fromEntries(next),
      xp: state.xp + xpGain,
    };
    await this.saveState(userId, newState);
    return { xpGain, xp: newState.xp, level: Levels.levelForXp(newState.xp) };
  }

  private async loadState(userId: string): Promise<UserMissionState> {
    return (await this.redis.get<UserMissionState>(this.key(userId))) ?? { progress: {}, xp: 0 };
  }

  private async saveState(userId: string, state: UserMissionState): Promise<void> {
    await this.redis.set(this.key(userId), state, 90 * 24 * 60 * 60);
  }

  private key(userId: string): string {
    return `mission:state:${userId}`;
  }
}
