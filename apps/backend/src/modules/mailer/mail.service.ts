import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { createTransport, type Transporter } from 'nodemailer';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Transactional email delivery. Uses SMTP when configured; otherwise logs the
 * message (development / CI) so flows remain fully testable without a mail
 * server. The public methods own the templates.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    const mail = this.config.mail;
    if (mail.host) {
      this.transporter = createTransport({
        host: mail.host,
        port: mail.port,
        secure: mail.secure,
        auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
      });
      this.logger.info(`Mailer configured for SMTP host ${mail.host}`, { context: 'MailService' });
    } else {
      this.logger.info('Mailer running in log-only mode (no SMTP configured)', {
        context: 'MailService',
      });
    }
  }

  private async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.info(`[mail:log-only] → ${message.to} :: ${message.subject}`, {
        context: 'MailService',
        preview: message.text.slice(0, 240),
      });
      return;
    }
    await this.transporter.sendMail({
      from: this.config.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private layout(title: string, body: string): string {
    return `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#0b0f1a;color:#e6e9ef;padding:32px">
      <div style="max-width:520px;margin:0 auto;background:#11162a;border:1px solid #232a42;border-radius:14px;padding:32px">
        <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
        ${body}
        <p style="color:#8b93a7;font-size:12px;margin-top:28px">If you did not request this, you can safely ignore this email.</p>
      </div></body></html>`;
  }

  async sendEmailVerification(to: string, link: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your email address',
      text: `Confirm your email by opening this link: ${link}`,
      html: this.layout(
        'Verify your email',
        `<p>Welcome! Confirm your email address to activate your account.</p>
         <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Verify email</a></p>
         <p style="color:#8b93a7;font-size:12px">Or paste this URL: ${link}</p>`,
      ),
    });
  }

  async sendPasswordReset(to: string, link: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${link}`,
      html: this.layout(
        'Reset your password',
        `<p>We received a request to reset your password.</p>
         <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
         <p style="color:#8b93a7;font-size:12px">This link expires shortly. Or paste: ${link}</p>`,
      ),
    });
  }

  async sendPasswordChanged(to: string): Promise<void> {
    await this.send({
      to,
      subject: 'Your password was changed',
      text: 'Your account password was just changed. If this was not you, contact support immediately.',
      html: this.layout(
        'Password changed',
        `<p>Your account password was just changed.</p>
         <p>If this wasn't you, reset your password and review your active sessions immediately.</p>`,
      ),
    });
  }

  async sendSecurityAlert(to: string, headline: string, detail: string): Promise<void> {
    await this.send({
      to,
      subject: `Security alert: ${headline}`,
      text: detail,
      html: this.layout('Security alert', `<p><strong>${headline}</strong></p><p>${detail}</p>`),
    });
  }
}
