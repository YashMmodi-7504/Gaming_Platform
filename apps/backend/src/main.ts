import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Route Nest's own logs through Winston.
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const config = app.get(AppConfigService);
  const { host, port, apiPrefix, apiVersion, corsOrigins, swaggerEnabled, swaggerPath, env } =
    config.app;

  // Security & performance middleware.
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Routing: /<prefix>/v<version>/...
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // Global validation.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  if (swaggerEnabled) {
    setupSwagger(app, config);
  }

  await app.listen(port, host);

  const baseUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 Backend [${env}] ready at ${baseUrl}/${apiPrefix}/v${apiVersion}`, 'Bootstrap');
  if (swaggerEnabled) {
    logger.log(`📚 Swagger docs at ${baseUrl}/${swaggerPath}`, 'Bootstrap');
  }
}

void bootstrap();
