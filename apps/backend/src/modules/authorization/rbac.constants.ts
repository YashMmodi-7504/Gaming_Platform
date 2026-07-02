import { UserRole } from '@gaming-platform/types';

/**
 * Canonical permission catalog (resource:action). This is the single source of
 * truth used by the idempotent RBAC bootstrap and by `@RequirePermissions`.
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_LOCK: 'users:lock',
  USERS_VERIFY: 'users:verify',
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_ASSIGN: 'roles:assign',
  PERMISSIONS_READ: 'permissions:read',
  PERMISSIONS_WRITE: 'permissions:write',
  SESSIONS_READ: 'sessions:read',
  SESSIONS_REVOKE: 'sessions:revoke',
  SECURITY_READ: 'security:read',
  AUDIT_READ: 'audit:read',
  GAMES_READ: 'games:read',
  GAMES_WRITE: 'games:write',
  WALLETS_READ: 'wallets:read',
  WALLETS_ADJUST: 'wallets:adjust',
  TRANSACTIONS_READ: 'transactions:read',
  ANALYTICS_READ: 'analytics:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  FEATURE_FLAGS_READ: 'feature_flags:read',
  FEATURE_FLAGS_WRITE: 'feature_flags:write',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionSlug[] = Object.values(PERMISSIONS);

/** Canonical role slugs. */
export const ROLE_SLUGS = {
  USER: 'user',
  VIP: 'vip',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export interface RoleDefinition {
  slug: RoleSlug;
  name: string;
  level: number;
  permissions: PermissionSlug[];
}

const MODERATOR_PERMS: PermissionSlug[] = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.SESSIONS_READ,
  PERMISSIONS.SECURITY_READ,
  PERMISSIONS.AUDIT_READ,
];

const ADMIN_PERMS: PermissionSlug[] = [
  ...MODERATOR_PERMS,
  PERMISSIONS.USERS_WRITE,
  PERMISSIONS.USERS_LOCK,
  PERMISSIONS.USERS_VERIFY,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.ROLES_ASSIGN,
  PERMISSIONS.PERMISSIONS_READ,
  PERMISSIONS.SESSIONS_REVOKE,
  PERMISSIONS.GAMES_READ,
  PERMISSIONS.GAMES_WRITE,
  PERMISSIONS.WALLETS_READ,
  PERMISSIONS.TRANSACTIONS_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.SETTINGS_READ,
  PERMISSIONS.FEATURE_FLAGS_READ,
];

/** System roles, seeded idempotently at boot. `super_admin` holds everything. */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { slug: ROLE_SLUGS.USER, name: 'User', level: 10, permissions: [] },
  { slug: ROLE_SLUGS.VIP, name: 'VIP', level: 20, permissions: [] },
  { slug: ROLE_SLUGS.MODERATOR, name: 'Moderator', level: 30, permissions: MODERATOR_PERMS },
  { slug: ROLE_SLUGS.ADMIN, name: 'Administrator', level: 40, permissions: ADMIN_PERMS },
  { slug: ROLE_SLUGS.SUPER_ADMIN, name: 'Super Admin', level: 50, permissions: ALL_PERMISSIONS },
];

/** Map a role slug to the coarse `UserRole` enum carried in tokens. */
export const ROLE_SLUG_TO_ENUM: Record<RoleSlug, UserRole> = {
  [ROLE_SLUGS.USER]: UserRole.USER,
  [ROLE_SLUGS.VIP]: UserRole.VIP,
  [ROLE_SLUGS.MODERATOR]: UserRole.MODERATOR,
  [ROLE_SLUGS.ADMIN]: UserRole.ADMIN,
  [ROLE_SLUGS.SUPER_ADMIN]: UserRole.SUPER_ADMIN,
};

export const DEFAULT_USER_ROLE: RoleSlug = ROLE_SLUGS.USER;
