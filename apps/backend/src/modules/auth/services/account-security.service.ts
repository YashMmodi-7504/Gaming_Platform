import { Injectable } from '@nestjs/common';
import { SecurityEventType, SecuritySeverity, UserStatus } from '@prisma/client';
import type { LoginHistorySummary, SecurityEventSummary } from '@gaming-platform/types';

import { AppConfigService } from '../../../config/app-config.service';
import type { RequestMeta } from '../../../common/security/request-meta';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../mailer/mail.service';
import { SecurityEventService } from '../../security/security-event.service';

export interface LockState {
  locked: boolean;
  lockedUntil: Date | null;
}

/**
 * Brute-force protection (failed-attempt counting + temporary lockout), the
 * login history feed, and the per-user security event feed.
 */
@Injectable()
export class AccountSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly security: SecurityEventService,
    private readonly mail: MailService,
  ) {}

  isLocked(user: { lockedUntil: Date | null; status: UserStatus }): boolean {
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) return true;
    return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
  }

  recordLogin(
    userId: string,
    success: boolean,
    meta: RequestMeta,
    failureReason?: string,
  ): Promise<unknown> {
    return this.prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        success,
        failureReason,
        countryCode: meta.countryCode,
        city: meta.city,
      },
    });
  }

  /** Count a failed attempt and lock the account when the threshold is crossed. */
  async registerFailedAttempt(userId: string, email: string, meta: RequestMeta): Promise<LockState> {
    const { accountLockMaxAttempts, accountLockDurationMinutes } = this.config.security;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });

    if (updated.failedLoginCount >= accountLockMaxAttempts) {
      const lockedUntil = new Date(Date.now() + accountLockDurationMinutes * 60 * 1000);
      await this.prisma.user.update({ where: { id: userId }, data: { lockedUntil } });
      await this.security.record({
        userId,
        type: SecurityEventType.ACCOUNT_LOCKED,
        severity: SecuritySeverity.HIGH,
        description: `Account locked after ${updated.failedLoginCount} failed attempts`,
        meta,
      });
      await this.mail.sendSecurityAlert(
        email,
        'Account temporarily locked',
        `Your account was locked after multiple failed sign-in attempts. It will unlock automatically at ${lockedUntil.toISOString()}.`,
      );
      return { locked: true, lockedUntil };
    }

    return { locked: false, lockedUntil: null };
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  /** Administrative unlock — clears lockout and reactivates a suspended account. */
  async unlock(userId: string, meta?: RequestMeta): Promise<{ success: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null, status: UserStatus.ACTIVE },
    });
    await this.security.record({
      userId,
      type: SecurityEventType.ACCOUNT_UNLOCKED,
      description: 'Account unlocked by administrator',
      meta,
    });
    return { success: true };
  }

  /** Administrative lock — suspends an account. */
  async lock(userId: string, reason: string | undefined, meta?: RequestMeta): Promise<{ success: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });
    await this.security.record({
      userId,
      type: SecurityEventType.ACCOUNT_LOCKED,
      severity: SecuritySeverity.HIGH,
      description: reason ?? 'Account suspended by administrator',
      meta,
    });
    return { success: true };
  }

  async getLoginHistory(userId: string, limit = 20): Promise<LoginHistorySummary[]> {
    const rows = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      success: r.success,
      failureReason: r.failureReason,
      location: [r.city, r.countryCode].filter(Boolean).join(', ') || null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getSecurityEvents(userId: string, limit = 50): Promise<SecurityEventSummary[]> {
    const rows = await this.prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      description: r.description,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
