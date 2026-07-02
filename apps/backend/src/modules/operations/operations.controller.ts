import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AlertRule } from '@gaming-platform/ops-core';

import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { MetricsService } from './services/metrics.service';
import { MonitoringService } from './services/monitoring.service';
import { OperationsHealthService } from './services/operations-health.service';
import { AlertService } from './services/alert.service';
import { QueueService } from './services/queue.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { LogBufferService } from './services/log-buffer.service';
import { LogQueryDto, UpsertAlertRuleDto } from './dto/operations.dto';

@ApiTags('Admin · Operations')
@ApiBearerAuth()
@Controller('admin/operations')
export class OperationsController {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly metrics: MetricsService,
    private readonly health: OperationsHealthService,
    private readonly alerts: AlertService,
    private readonly queue: QueueService,
    private readonly breakers: CircuitBreakerService,
    private readonly logs: LogBufferService,
  ) {}

  @Get('overview')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Operations overview (health, system, API, queue, alerts)' })
  overview() {
    return this.monitoring.overview();
  }

  @Get('health')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Deep health with dependency graph' })
  deepHealth() {
    return this.health.check();
  }

  @Get('metrics')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Metrics snapshot (counters, gauges, histograms)' })
  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  @Get('metrics/prometheus')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Prometheus exposition text' })
  prometheus() {
    return { format: 'prometheus', text: this.metrics.prometheus() };
  }

  @Get('system')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Live system metrics (memory, CPU, event loop)' })
  system() {
    return this.monitoring.system();
  }

  @Get('logs')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Recent structured logs (filterable)' })
  recentLogs(@Query() query: LogQueryDto) {
    return { entries: this.logs.recent(query), stats: this.logs.stats() };
  }

  @Get('queue')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Background job / queue statistics' })
  queueStats() {
    return { stats: this.queue.stats(), deadLetter: this.queue.deadLetters() };
  }

  @Post('queue/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Requeue a dead-letter job' })
  retryJob(@Param('jobId') jobId: string) {
    return { retried: this.queue.retry(jobId) };
  }

  @Get('circuits')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Circuit breaker states' })
  circuits() {
    return this.breakers.states();
  }

  @Get('alerts')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Alert rules' })
  alertRules() {
    return this.alerts.rules();
  }

  @Get('alerts/active')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Active (firing) incidents' })
  activeAlerts() {
    return this.alerts.activeIncidents();
  }

  @Post('alerts')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Create or update an alert rule' })
  upsertAlert(@Body() dto: UpsertAlertRuleDto) {
    return this.alerts.upsertRule(dto as unknown as AlertRule);
  }
}

@ApiTags('Operations')
@Controller('operations')
export class PublicOperationsController {
  constructor(private readonly health: OperationsHealthService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Public service status (up / degraded / down)' })
  async status() {
    const health = await this.health.check();
    return { status: health.status, checkedAt: health.checkedAt };
  }
}
