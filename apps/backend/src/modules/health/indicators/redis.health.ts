import { Injectable } from '@nestjs/common';
import { HealthIndicator, type HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const healthy = await this.redis.ping();
    const result = this.getStatus(key, healthy);

    if (healthy) {
      return result;
    }

    throw new HealthCheckError('Redis check failed', result);
  }
}
