import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '@gaming-platform/types';

import {
  PERMISSIONS_KEY,
  type PermissionRequirement,
} from '../../../common/decorators/require-permissions.decorator';
import { ROLE_SLUGS } from '../rbac.constants';

/**
 * Enforces fine-grained permissions declared via `@RequirePermissions` /
 * `@RequireAnyPermission`. Super admins bypass every check. Runs after the JWT
 * guard, so the permission claims are already present on `request.user`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement || requirement.permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const roles = user.roles ?? [];
    if (roles.includes(ROLE_SLUGS.SUPER_ADMIN)) {
      return true;
    }

    const granted = new Set(user.permissions ?? []);
    const ok =
      requirement.mode === 'any'
        ? requirement.permissions.some((p) => granted.has(p))
        : requirement.permissions.every((p) => granted.has(p));

    if (!ok) {
      throw new ForbiddenException('Insufficient permissions for this resource');
    }
    return true;
  }
}
