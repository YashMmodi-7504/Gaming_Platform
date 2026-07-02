import { Injectable } from '@nestjs/common';
import { dependencyGraph, rollup, type DependencyHealth, type HealthStatus } from '@gaming-platform/ops-core';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface DeepHealth {
  status: HealthStatus;
  dependencies: DependencyHealth[];
  graph: ReturnType<typeof dependencyGraph>;
  checkedAt: string;
}

/**
 * Deep operational health — beyond the liveness probe, this times each critical
 * dependency (database, cache) and rolls them into an overall status plus the
 * service dependency graph for the operations dashboard.
 */
@Injectable()
export class OperationsHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<DeepHealth> {
    const dependencies = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    return {
      status: rollup(dependencies),
      dependencies,
      graph: dependencyGraph(),
      checkedAt: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { name: 'database', critical: true, status: latencyMs > 500 ? 'degraded' : 'up', latencyMs };
    } catch (error) {
      return { name: 'database', critical: true, status: 'down', detail: (error as Error).message };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      const ok = await this.redis.ping();
      const latencyMs = Date.now() - start;
      return { name: 'redis', critical: true, status: ok ? (latencyMs > 200 ? 'degraded' : 'up') : 'down', latencyMs };
    } catch (error) {
      return { name: 'redis', critical: true, status: 'down', detail: (error as Error).message };
    }
  }
}
