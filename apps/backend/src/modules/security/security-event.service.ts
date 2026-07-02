import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import { SecurityEventType, SecuritySeverity } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import type { RequestMeta } from '../../common/security/request-meta';
import { PrismaService } from '../database/prisma.service';

export interface RecordSecurityEventInput {
  userId?: string | null;
  type: SecurityEventType;
  severity?: SecuritySeverity;
  description?: string;
  meta?: RequestMeta | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only security event log. Every authentication-relevant action
 * (logins, password changes, MFA changes, lockouts, suspicious activity) is
 * recorded here for auditing and anomaly detection.
 */
@Injectable()
export class SecurityEventService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async record(input: RecordSecurityEventInput): Promise<void> {
    try {
      await this.prisma.securityEvent.create({
        data: {
          userId: input.userId ?? null,
          type: input.type,
          severity: input.severity ?? SecuritySeverity.INFO,
          description: input.description,
          ipAddress: input.meta?.ipAddress ?? null,
          userAgent: input.meta?.userAgent ?? null,
          metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Never let security logging break the primary flow.
      this.logger.warn('Failed to persist security event', {
        context: 'SecurityEventService',
        type: input.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
