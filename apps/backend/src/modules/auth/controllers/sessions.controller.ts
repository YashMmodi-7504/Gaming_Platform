import { Controller, Delete, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser, SessionSummary } from '@gaming-platform/types';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/security/request-meta';
import { SessionService } from '../services/session.service';

@ApiTags('Account Security')
@ApiBearerAuth()
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<SessionSummary[]> {
    return this.sessions.listForUser(user.id, user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.sessions.revoke(user.id, id, meta);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all other sessions (keep the current one)' })
  revokeOthers(@CurrentUser() user: AuthenticatedUser) {
    return this.sessions.revokeAll(user.id, user.sessionId);
  }
}
