import { Injectable } from '@nestjs/common';
import { HealthIndicator, type HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const healthy = await this.prisma.isHealthy();
    const result = this.getStatus(key, healthy);

    if (healthy) {
      return result;
    }

    throw new HealthCheckError('Prisma check failed', result);
  }
}
