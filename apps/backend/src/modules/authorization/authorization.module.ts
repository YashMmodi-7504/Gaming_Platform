import { Global, Module } from '@nestjs/common';

import { PermissionsGuard } from './guards/permissions.guard';
import { RbacBootstrapService } from './rbac-bootstrap.service';
import { RbacService } from './rbac.service';
import { RolesService } from './roles.service';

/**
 * Role-based access control. Exposes {@link RbacService} (token-claim
 * resolution), {@link RolesService} (admin management), and the
 * {@link PermissionsGuard}. Seeds the system RBAC catalog on boot.
 */
@Global()
@Module({
  providers: [RbacService, RolesService, RbacBootstrapService, PermissionsGuard],
  exports: [RbacService, RolesService, PermissionsGuard],
})
export class AuthorizationModule {}
