import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';

import { AppConfigService } from '../config/app-config.service';
import { ConfigModule } from '../config/config.module';
import { createWinstonOptions } from './winston.config';

/**
 * Global Winston-backed logger. Registered first so every other module — and
 * Nest's own bootstrap logger — writes through the same pipeline.
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        createWinstonOptions({
          level: config.app.logLevel,
          appName: config.app.name,
          isProduction: config.isProduction,
        }),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
