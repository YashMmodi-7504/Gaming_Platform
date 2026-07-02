import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { AppConfigService } from './config/app-config.service';

/**
 * Configures the OpenAPI (Swagger) documentation endpoint.
 */
export function setupSwagger(app: INestApplication, config: AppConfigService): void {
  const { name, apiPrefix, apiVersion, swaggerPath } = config.app;

  const builder = new DocumentBuilder()
    .setTitle(`${name} API`)
    .setDescription('Enterprise gaming platform — REST API documentation.')
    .setVersion(apiVersion)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addServer(`/${apiPrefix}/v${apiVersion}`, 'Versioned API')
    .addTag('Health')
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Games')
    .addTag('Wallet')
    .addTag('Transactions')
    .addTag('Notifications')
    .addTag('Admin')
    .addTag('Analytics')
    .build();

  const document = SwaggerModule.createDocument(app, builder);

  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: `${name} API Docs`,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
