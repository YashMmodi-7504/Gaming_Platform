import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfigService } from '../../config/app-config.service';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

/**
 * Global Redis module. Constructs a single shared ioredis connection from the
 * validated configuration and exposes the {@link RedisService}.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Redis => {
        const { host, port, password, url } = config.redis;
        const client = url
          ? new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 })
          : new Redis({
              host,
              port,
              password: password || undefined,
              lazyConnect: true,
              maxRetriesPerRequest: 3,
            });
        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule implements OnModuleInit {
  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    // Establish the lazy connection eagerly at startup.
    await this.redis.raw.connect().catch(() => undefined);
  }
}
