import { UserRole } from '@gaming-platform/types';

/**
 * Role hierarchy. A higher numeric weight inherits every capability of the
 * roles below it.
 */
const ROLE_WEIGHT: Record<UserRole, number> = {
  [UserRole.USER]: 10,
  [UserRole.VIP]: 20,
  [UserRole.MODERATOR]: 30,
  [UserRole.ADMIN]: 40,
  [UserRole.SUPER_ADMIN]: 50,
};

/**
 * Returns true when `role` satisfies the `required` role (equal or higher).
 */
export const roleSatisfies = (role: UserRole, required: UserRole): boolean =>
  ROLE_WEIGHT[role] >= ROLE_WEIGHT[required];

/**
 * Returns true when `role` satisfies at least one of the required roles.
 */
export const hasAnyRole = (role: UserRole, required: UserRole[]): boolean =>
  required.some((r) => roleSatisfies(role, r));

export const isAdmin = (role: UserRole): boolean => roleSatisfies(role, UserRole.ADMIN);
