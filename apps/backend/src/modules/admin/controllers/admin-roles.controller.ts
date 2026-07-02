import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Param } from '@nestjs/common';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../authorization/rbac.constants';
import { RolesService } from '../../authorization/roles.service';
import { CreateRoleDto, SetRolePermissionsDto } from '../dto/admin.dto';

@ApiTags('Admin · Roles & Permissions')
@ApiBearerAuth()
@Controller('admin')
export class AdminRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'List all roles with their permissions' })
  listRoles() {
    return this.roles.listRoles();
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Create a custom role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.roles.createRole(dto);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions(PERMISSIONS.PERMISSIONS_WRITE)
  @ApiOperation({ summary: 'Replace the permission set of a role' })
  setPermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto) {
    return this.roles.setRolePermissions(id, dto.permissionIds);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.PERMISSIONS_READ)
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions() {
    return this.roles.listPermissions();
  }
}
