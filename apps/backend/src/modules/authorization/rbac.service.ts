import { Injectable } from '@nestjs/common';
import { UserRole } from '@gaming-platform/types';

import { CACHE_KEYS } from '@gaming-platform/shared';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../database/prisma.service';
import { type RoleSlug, ROLE_SLUG_TO_ENUM, ROLE_SLUGS } from './rbac.constants';

export interface UserAuthz {
  roles: string[];
  permissions: string[];
  primaryRole: UserRole;
}

const AUTHZ_TTL_SECONDS = 300;

/**
 * Resolves and caches a user's effective authorization (role slugs, flattened
 * permissions, and the coarse primary role). The cache is invalidated whenever
 * a user's roles change, so tokens minted afterwards carry fresh claims.
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(userId: string): string {
    return `rbac:authz:${userId}`;
  }

  async getUserAuthz(userId: string): Promise<UserAuthz> {
    const cached = await this.redis.get<UserAuthz>(this.cacheKey(userId));
    if (cached) return cached;

    const authz = await this.loadFromDb(userId);
    await this.redis.set(this.cacheKey(userId), authz, AUTHZ_TTL_SECONDS);
    return authz;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId), CACHE_KEYS.user(userId));
  }

  private async loadFromDb(userId: string): Promise<UserAuthz> {
    const now = new Date();
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const roles: string[] = [];
    const permissions = new Set<string>();
    let highest = { level: -1, slug: ROLE_SLUGS.USER as RoleSlug };

    for (const ur of userRoles) {
      roles.push(ur.role.slug);
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.slug);
      }
      if (ur.role.level > highest.level) {
        highest = { level: ur.role.level, slug: ur.role.slug as RoleSlug };
      }
    }

    return {
      roles,
      permissions: [...permissions],
      primaryRole: ROLE_SLUG_TO_ENUM[highest.slug] ?? UserRole.USER,
    };
  }
}
