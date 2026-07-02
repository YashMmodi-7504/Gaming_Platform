import { Injectable } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';

const EPOCH_KEY = 'games:cache:epoch';

/**
 * Catalog cache with epoch-based invalidation: every cache key is namespaced by
 * a monotonic epoch counter. Any catalog mutation bumps the epoch, atomically
 * invalidating the entire cache without scanning keys.
 */
@Injectable()
export class GameCacheService {
  constructor(private readonly redis: RedisService) {}

  private async epoch(): Promise<number> {
    const value = await this.redis.raw.get(EPOCH_KEY);
    if (!value) {
      await this.redis.raw.set(EPOCH_KEY, '1');
      return 1;
    }
    return Number.parseInt(value, 10) || 1;
  }

  /** Read-through cache: returns the cached value or computes & stores it. */
  async wrap<T>(parts: Array<string | number>, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const epoch = await this.epoch();
    const key = `games:v${epoch}:${parts.join(':')}`;
    const cached = await this.redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const fresh = await factory();
    await this.redis.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Invalidate the entire catalog cache. */
  async invalidate(): Promise<void> {
    await this.redis.raw.incr(EPOCH_KEY);
  }
}
