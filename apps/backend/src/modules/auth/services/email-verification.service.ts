import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenStatus, UserStatus } from '@prisma/client';

import { AppConfigService } from '../../../config/app-config.service';
import { generateToken, sha256 } from '../../../common/security/crypto.util';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../mailer/mail.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
  ) {}

  /** Issue a verification token and email the activation link. */
  async issue(userId: string, email: string): Promise<void> {
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + this.config.security.emailVerificationTtlHours * 3600 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, status: TokenStatus.ACTIVE },
        data: { status: TokenStatus.REVOKED },
      }),
      this.prisma.emailVerificationToken.create({
        data: { userId, email, tokenHash: sha256(token), status: TokenStatus.ACTIVE, expiresAt },
      }),
    ]);

    const link = `${this.config.app.webUrl}/verify-email?token=${token}`;
    await this.mail.sendEmailVerification(email, link);
  }

  async resend(userId: string): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified) return { success: true };
    await this.issue(userId, user.email);
    return { success: true };
  }

  /** Verify a token, activate the account, and mark the email verified. */
  async verify(token: string): Promise<{ success: true }> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.status !== TokenStatus.ACTIVE) {
      throw new BadRequestException('Invalid or already-used verification link');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { status: TokenStatus.EXPIRED },
      });
      throw new BadRequestException('Verification link has expired');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { status: TokenStatus.USED, verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

    return { success: true };
  }
}
