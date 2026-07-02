import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, UserStatus } from '@prisma/client';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type { PaginatedResult } from '@gaming-platform/types';

import type { RequestMeta } from '../../../common/security/request-meta';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../security/audit.service';
import { RolesService } from '../../authorization/roles.service';
import { AccountSecurityService } from '../../auth/services/account-security.service';
import { SessionService } from '../../auth/services/session.service';

export interface AdminUserSummary {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Administrative user management — listing/search, lockout control, manual
 * verification, role assignment, and session inspection. Every mutating action
 * writes an audit trail entry.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountSecurity: AccountSecurityService,
    private readonly roles: RolesService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<AdminUserSummary>> {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const where = query.search
      ? {
          deletedAt: null,
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { username: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : { deletedAt: null };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { profile: { select: { displayName: true } }, roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = rows.map<AdminUserSummary>((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.profile?.displayName ?? null,
      status: u.status,
      emailVerified: u.emailVerified,
      twoFactorEnabled: u.twoFactorEnabled,
      roles: u.roles.map((r) => r.role.slug),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }));

    return buildPaginatedResult(items, total, page, limit);
  }

  async get(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        profile: true,
        roles: { include: { role: true } },
        _count: { select: { sessions: true, devices: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async lock(adminId: string, userId: string, reason: string | undefined, meta: RequestMeta) {
    await this.get(userId);
    await this.accountSecurity.lock(userId, reason, meta);
    await this.audit.record({
      userId: adminId,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: userId,
      changes: { status: UserStatus.SUSPENDED, reason },
      meta,
    });
    return { success: true as const };
  }

  async unlock(adminId: string, userId: string, meta: RequestMeta) {
    await this.get(userId);
    await this.accountSecurity.unlock(userId, meta);
    await this.audit.record({
      userId: adminId,
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: userId,
      changes: { status: UserStatus.ACTIVE },
      meta,
    });
    return { success: true as const };
  }

  async manualVerify(adminId: string, userId: string, meta: RequestMeta) {
    await this.get(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, status: UserStatus.ACTIVE },
    });
    await this.audit.record({
      userId: adminId,
      action: AuditAction.APPROVE,
      entityType: 'user',
      entityId: userId,
      changes: { emailVerified: true },
      meta,
    });
    return { success: true as const };
  }

  async assignRole(adminId: string, userId: string, roleId: string, meta: RequestMeta) {
    const result = await this.roles.assignRoleToUser(userId, roleId, adminId);
    await this.audit.record({
      userId: adminId,
      action: AuditAction.UPDATE,
      entityType: 'user_role',
      entityId: userId,
      changes: { assignedRoleId: roleId },
      meta,
    });
    return result;
  }

  async removeRole(adminId: string, userId: string, roleId: string, meta: RequestMeta) {
    const result = await this.roles.removeRoleFromUser(userId, roleId);
    await this.audit.record({
      userId: adminId,
      action: AuditAction.UPDATE,
      entityType: 'user_role',
      entityId: userId,
      changes: { removedRoleId: roleId },
      meta,
    });
    return result;
  }

  listSessions(userId: string) {
    return this.sessions.listForUser(userId);
  }

  async revokeSessions(adminId: string, userId: string, meta: RequestMeta) {
    const result = await this.sessions.revokeAll(userId);
    await this.audit.record({
      userId: adminId,
      action: AuditAction.DELETE,
      entityType: 'sessions',
      entityId: userId,
      meta,
    });
    return result;
  }

  securityEvents(userId: string) {
    return this.accountSecurity.getSecurityEvents(userId);
  }
}
