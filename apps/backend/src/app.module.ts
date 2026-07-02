import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PermissionsGuard } from './modules/authorization/guards/permissions.guard';
import { AppConfigService } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { CardModule } from './modules/card/card.module';
import { CrashModule } from './modules/crash/crash.module';
import { DatabaseModule } from './modules/database/database.module';
import { DiceModule } from './modules/dice/dice.module';
import { GamesModule } from './modules/games/games.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mailer/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OperationsModule } from './modules/operations/operations.module';
import { RedisModule } from './modules/redis/redis.module';
import { RouletteModule } from './modules/roulette/roulette.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { SportsModule } from './modules/sports/sports.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { SecurityModule } from './modules/security/security.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WalletEngineModule } from './modules/wallet-engine/wallet-engine.module';

@Module({
  imports: [
    // Infrastructure
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: config.throttle.ttl * 1000,
            limit: config.throttle.limit,
          },
        ],
      }),
    }),

    // Cross-cutting security
    SecurityModule,
    MailModule,
    AuthorizationModule,

    // Observability & reliability — global; the metrics interceptor and
    // resilience/queue services are available platform-wide.
    OperationsModule,

    // Financial backbone — global; must register before the game engines so the
    // wallet bridge is available for integration.
    WalletEngineModule,

    // Domain modules
    HealthModule,
    AuthModule,
    UsersModule,
    GamesModule,
    RuntimeModule,
    CardModule,
    RouletteModule,
    DiceModule,
    CrashModule,
    SportsModule,
    TournamentModule,
    AiModule,
    WalletModule,
    TransactionsModule,
    NotificationsModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards: rate limit → authenticate → authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global response envelope and request logging.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Global exception normalization.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
