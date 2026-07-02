import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@gaming-platform/types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users whose role satisfies at least one of the given
 * roles. Enforced by the {@link RolesGuard}.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
