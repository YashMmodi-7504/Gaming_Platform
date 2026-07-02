import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { PERMISSIONS } from '../../authorization/rbac.constants';
import { AdminAuditService } from '../services/admin-audit.service';

@ApiTags('Admin · Audit')
@ApiBearerAuth()
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Browse the audit trail (paginated, filterable)' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'userId', required: false })
  list(
    @Query() query: PaginationQueryDto,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.audit.list({ page: query.page, limit: query.limit, entityType, userId });
  }
}
