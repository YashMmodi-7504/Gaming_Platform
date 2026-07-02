import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { OperationsController, PublicOperationsController } from './operations.controller';
import { OperationsGateway } from './operations.gateway';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './services/metrics.service';
import { MonitoringService } from './services/monitoring.service';
import { OperationsHealthService } from './services/operations-health.service';
import { AlertService } from './services/alert.service';
import { QueueService } from './services/queue.service';
import { TracingService } from './services/tracing.service';
import { LogBufferService } from './services/log-buffer.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

/**
 * Enterprise Operations, Monitoring, Reliability & Production platform. Global so
 * the metrics interceptor and resilience/queue/metrics services are available to
 * every module. Observability (metrics, tracing, logs), alerting, health,
 * queues, circuit breakers and the realtime ops dashboard live here.
 */
@Global()
@Module({
  controllers: [OperationsController, PublicOperationsController],
  providers: [
    MetricsService,
    TracingService,
    LogBufferService,
    MonitoringService,
    OperationsHealthService,
    AlertService,
    QueueService,
    CircuitBreakerService,
    OperationsGateway,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService, TracingService, QueueService, CircuitBreakerService, LogBufferService, AlertService],
})
export class OperationsModule {}
