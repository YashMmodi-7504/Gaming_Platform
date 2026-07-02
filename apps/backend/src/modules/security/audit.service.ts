import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { AuditAction } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import type { RequestMeta } from '../../common/security/request-meta';
import { PrismaService } from '../database/prisma.service';

export interface RecordAuditInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  meta?: RequestMeta | null;
}

/**
 * Generic, tamper-evident audit trail. Captures who did what to which entity,
 * with a before/after change set when relevant.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditTrail.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          changes: (input.changes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          ipAddress: input.meta?.ipAddress ?? null,
          userAgent: input.meta?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist audit trail', {
        context: 'AuditService',
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
