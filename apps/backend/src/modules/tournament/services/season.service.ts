import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';

import { PrismaService } from '../../database/prisma.service';

const SCOPE = 'season';
const ENV = 'production';

export interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  /** Points table mapping finishing rank → season points. */
  rankPoints: Record<number, number>;
  description?: string;
}

/**
 * Seasons / championships — long-running competitions that aggregate tournament
 * and leaderboard results into a season standing. Stored as configuration so new
 * seasons are data.
 */
@Injectable()
export class SeasonService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Season[]> {
    const rows = await this.prisma.applicationSetting.findMany({ where: { scope: SCOPE, environment: ENV } });
    return rows.map((r) => r.value as unknown as Season).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }

  async current(): Promise<Season | null> {
    const all = await this.list();
    return all.find((s) => s.active) ?? null;
  }

  async get(id: string): Promise<Season> {
    const row = await this.prisma.applicationSetting.findUnique({
      where: { scope_key_environment: { scope: SCOPE, key: id, environment: ENV } },
    });
    if (!row) throw new NotFoundException(`Season "${id}" not found`);
    return row.value as unknown as Season;
  }

  async upsert(season: Season): Promise<Season> {
    // Only one active season at a time.
    if (season.active) {
      const all = await this.list();
      for (const other of all) {
        if (other.id !== season.id && other.active) {
          await this.save({ ...other, active: false });
        }
      }
    }
    await this.save(season);
    return season;
  }

  private async save(season: Season): Promise<void> {
    await this.prisma.applicationSetting.upsert({
      where: { scope_key_environment: { scope: SCOPE, key: season.id, environment: ENV } },
      update: { value: season as unknown as Prisma.InputJsonValue },
      create: { scope: SCOPE, key: season.id, environment: ENV, valueType: 'JSON', value: season as unknown as Prisma.InputJsonValue },
    });
  }
}
