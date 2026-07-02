import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAnyRole } from '@gaming-platform/auth';
import type { AuthenticatedUser, UserRole } from '@gaming-platform/types';

import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Authorizes requests against the roles declared via {@link Roles}. Runs after
 * the {@link JwtAuthGuard}, so `request.user` is guaranteed to be present for
 * protected routes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !hasAnyRole(user.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient permissions for this resource');
    }

    return true;
  }
}
