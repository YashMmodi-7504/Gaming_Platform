import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import configuration from './configuration';
import { validateEnv } from './env.validation';

/**
 * Global configuration module. Loads layered `.env` files, validates the
 * environment with Zod, and exposes the typed {@link AppConfigService}.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
      load: [configuration],
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env.local',
        '.env',
      ],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService, NestConfigModule],
})
export class ConfigModule {}
