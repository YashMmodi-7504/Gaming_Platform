import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { AnalyticsAiService } from './services/analytics-ai.service';
import { FraudService } from './services/fraud.service';
import { RiskService } from './services/risk.service';
import { AskDto } from './dto/ai.dto';

@ApiTags('Admin · AI')
@ApiBearerAuth()
@Controller('admin/ai')
export class AdminAiController {
  constructor(
    private readonly analytics: AnalyticsAiService,
    private readonly fraud: FraudService,
    private readonly risk: RiskService,
  ) {}

  // ---- Admin AI assistant --------------------------------------------------

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Ask the admin AI assistant a question (grounded in live data)' })
  ask(@Body() dto: AskDto) {
    return this.analytics.ask(dto.question, dto.userId);
  }

  @Get('insights/revenue')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Explain revenue' })
  revenue(@Query('hours') hours?: string) {
    return this.analytics.revenueInsight(hours ? Number(hours) : 24);
  }

  @Get('insights/tournaments')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Tournament insights' })
  tournaments() {
    return this.analytics.tournamentInsight();
  }

  @Get('insights/wallet')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Wallet insights' })
  wallet() {
    return this.analytics.walletInsight();
  }

  @Get('insights/alerts')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Alert / incident summary' })
  alerts() {
    return this.analytics.alertSummary();
  }

  @Get('insights/player/:userId')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Player insights (segment, churn, risk)' })
  player(@Param('userId') userId: string) {
    return this.analytics.playerInsight(userId);
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Generate the daily operations report' })
  report() {
    return this.analytics.generateReport();
  }

  // ---- Fraud & risk --------------------------------------------------------

  @Get('fraud/scan')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Scan recently-active accounts for fraud' })
  fraudScan(@Query('limit') limit?: string) {
    return this.fraud.scan(limit ? Number(limit) : 50);
  }

  @Get('fraud/:userId')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Fraud assessment for an account' })
  fraudAssess(@Param('userId') userId: string) {
    return this.fraud.assess(userId);
  }

  @Get('risk/:userId')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Full player risk profile (risk, RG, segment, churn)' })
  riskProfile(@Param('userId') userId: string) {
    return this.risk.profile(userId);
  }
}
