import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@gaming-platform/database';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';

/**
 * NestJS-aware Prisma client. Manages the connection lifecycle and exposes the
 * fully-typed client to the rest of the application.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    super({
      datasources: { db: { url: config.database.url } },
      log: config.isProduction ? ['warn', 'error'] : ['warn', 'error'],
      errorFormat: config.isProduction ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.info('Prisma connected to the database', { context: 'PrismaService' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Prisma disconnected', { context: 'PrismaService' });
  }

  /**
   * Lightweight connectivity probe used by the health module.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
