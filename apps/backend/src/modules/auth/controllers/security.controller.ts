import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LoginHistorySummary, SecurityEventSummary } from '@gaming-platform/types';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AccountSecurityService } from '../services/account-security.service';

@ApiTags('Account Security')
@ApiBearerAuth()
@Controller('auth/security')
export class SecurityController {
  constructor(private readonly accountSecurity: AccountSecurityService) {}

  @Get('login-history')
  @ApiOperation({ summary: 'Recent login attempts for the current user' })
  loginHistory(@CurrentUser('id') userId: string): Promise<LoginHistorySummary[]> {
    return this.accountSecurity.getLoginHistory(userId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Recent security events for the current user' })
  events(@CurrentUser('id') userId: string): Promise<SecurityEventSummary[]> {
    return this.accountSecurity.getSecurityEvents(userId);
  }
}
