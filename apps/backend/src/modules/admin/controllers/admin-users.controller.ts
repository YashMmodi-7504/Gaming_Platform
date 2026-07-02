import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ReqMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/security/request-meta';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { PERMISSIONS } from '../../authorization/rbac.constants';
import { AdminUsersService } from '../services/admin-users.service';
import { AssignRoleDto, LockUserDto } from '../dto/admin.dto';

@ApiTags('Admin · Users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  list(@Query() query: PaginationQueryDto) {
    return this.users.list({ page: query.page, limit: query.limit, search: query.search });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get a user with roles and counts' })
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_LOCK)
  @ApiOperation({ summary: 'Suspend (lock) a user account' })
  lock(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: LockUserDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.lock(adminId, id, dto.reason, meta);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_LOCK)
  @ApiOperation({ summary: 'Unlock / reactivate a user account' })
  unlock(@CurrentUser('id') adminId: string, @Param('id') id: string, @ReqMeta() meta: RequestMeta) {
    return this.users.unlock(adminId, id, meta);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_VERIFY)
  @ApiOperation({ summary: 'Manually verify a user email' })
  verify(@CurrentUser('id') adminId: string, @Param('id') id: string, @ReqMeta() meta: RequestMeta) {
    return this.users.manualVerify(adminId, id, meta);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.assignRole(adminId, id, dto.roleId, meta);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Remove a role from a user' })
  removeRole(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.removeRole(adminId, id, roleId, meta);
  }

  @Get(':id/sessions')
  @RequirePermissions(PERMISSIONS.SESSIONS_READ)
  @ApiOperation({ summary: 'List a user active sessions' })
  sessions(@Param('id') id: string) {
    return this.users.listSessions(id);
  }

  @Delete(':id/sessions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SESSIONS_REVOKE)
  @ApiOperation({ summary: 'Revoke all sessions for a user' })
  revokeSessions(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.revokeSessions(adminId, id, meta);
  }

  @Get(':id/security-events')
  @RequirePermissions(PERMISSIONS.SECURITY_READ)
  @ApiOperation({ summary: 'List a user security events' })
  securityEvents(@Param('id') id: string) {
    return this.users.securityEvents(id);
  }
}
