import { Injectable } from '@nestjs/common';
import { buildPaginatedResult, normalizePagination } from '@gaming-platform/shared';
import type { PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';

export interface AuditTrailRow {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    entityType?: string;
    userId?: string;
  }): Promise<PaginatedResult<AuditTrailRow>> {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const where = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditTrail.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditTrail.count({ where }),
    ]);

    const items = rows.map<AuditTrailRow>((r) => ({
      id: r.id,
      userId: r.userId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    }));

    return buildPaginatedResult(items, total, page, limit);
  }
}
