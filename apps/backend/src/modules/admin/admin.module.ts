import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminUsersService } from './services/admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminUsersController, AdminRolesController, AdminAuditController],
  providers: [AdminService, AdminUsersService, AdminAuditService],
  exports: [AdminService],
})
export class AdminModule {}
