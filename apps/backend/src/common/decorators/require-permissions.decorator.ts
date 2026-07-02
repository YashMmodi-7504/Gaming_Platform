import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export type PermissionMode = 'all' | 'any';

export interface PermissionRequirement {
  permissions: string[];
  mode: PermissionMode;
}

/**
 * Requires the authenticated user to hold every listed permission
 * (`resource:action` slugs). Enforced by the `PermissionsGuard`.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata<string, PermissionRequirement>(PERMISSIONS_KEY, { permissions, mode: 'all' });

/** Requires the user to hold at least one of the listed permissions. */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata<string, PermissionRequirement>(PERMISSIONS_KEY, { permissions, mode: 'any' });
