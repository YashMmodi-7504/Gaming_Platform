import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenStatus } from '@prisma/client';
import { SecurityEventType, SecuritySeverity } from '@prisma/client';

import { AppConfigService } from '../../../config/app-config.service';
import { generateToken, sha256 } from '../../../common/security/crypto.util';
import type { RequestMeta } from '../../../common/security/request-meta';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../mailer/mail.service';
import { SecurityEventService } from '../../security/security-event.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    private readonly security: SecurityEventService,
  ) {}

  /** Always returns success to avoid leaking which emails are registered. */
  async request(email: string, meta: RequestMeta): Promise<{ success: true }> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: { id: true, email: true },
    });

    if (user) {
      const token = generateToken();
      const expiresAt = new Date(
        Date.now() + this.config.security.passwordResetTtlMinutes * 60 * 1000,
      );
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, status: TokenStatus.ACTIVE },
          data: { status: TokenStatus.REVOKED },
        }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: sha256(token), status: TokenStatus.ACTIVE, expiresAt },
        }),
      ]);

      const link = `${this.config.app.webUrl}/reset-password?token=${token}`;
      await this.mail.sendPasswordReset(user.email, link);
      await this.security.record({
        userId: user.id,
        type: SecurityEventType.PASSWORD_RESET_REQUEST,
        meta,
      });
    }

    return { success: true };
  }

  async reset(token: string, newPassword: string, meta: RequestMeta): Promise<{ success: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.status !== TokenStatus.ACTIVE) {
      throw new BadRequestException('Invalid or already-used reset link');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { status: TokenStatus.EXPIRED },
      });
      throw new BadRequestException('Reset link has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      throw new BadRequestException('Account no longer exists');
    }

    await this.passwords.assertAcceptable(newPassword, [user.email, user.username]);
    const passwordHash = await this.passwords.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { status: TokenStatus.USED, usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
    ]);

    // Invalidate every existing session after a password reset.
    await this.sessions.revokeAll(user.id);
    await this.security.record({
      userId: user.id,
      type: SecurityEventType.PASSWORD_RESET_COMPLETE,
      severity: SecuritySeverity.MEDIUM,
      description: 'Password reset completed; all sessions revoked',
      meta,
    });
    await this.mail.sendPasswordChanged(user.email);

    return { success: true };
  }
}
