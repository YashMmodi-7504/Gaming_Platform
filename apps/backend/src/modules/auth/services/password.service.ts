import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from '@gaming-platform/auth';
import { PASSWORD_POLICY } from '@gaming-platform/shared';
import type { PasswordStrengthResult } from '@gaming-platform/types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { AppConfigService } from '../../../config/app-config.service';

/** A small set of the most common passwords, rejected outright. */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'admin123',
  'welcome1',
  'letmein123',
  'football',
  'monkey123',
  'abc12345',
  'gaming123',
]);

const STRENGTH_LABELS = ['very-weak', 'weak', 'fair', 'strong', 'very-strong'] as const;

@Injectable()
export class PasswordService {
  constructor(
    private readonly config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  hash(plain: string): Promise<string> {
    return hashPassword(plain, this.config.auth.saltRounds);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return verifyPassword(plain, hash);
  }

  /**
   * Deterministic strength assessment (0–4) with actionable feedback. Penalizes
   * common passwords and values derived from the user's own identifiers.
   */
  evaluateStrength(password: string, userInputs: string[] = []): PasswordStrengthResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const lower = password.toLowerCase();

    const classes =
      (/[a-z]/.test(password) ? 1 : 0) +
      (/[A-Z]/.test(password) ? 1 : 0) +
      (/\d/.test(password) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

    let score = 0;
    if (password.length >= PASSWORD_POLICY.MIN_LENGTH) score += 1;
    if (password.length >= 12) score += 1;
    if (classes >= 3) score += 1;
    if (classes === 4 && password.length >= 12) score += 1;

    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      warnings.push(`Use at least ${PASSWORD_POLICY.MIN_LENGTH} characters.`);
    }
    if (classes < 3) {
      suggestions.push('Mix uppercase, lowercase, numbers, and symbols.');
    }
    if (password.length < 12) {
      suggestions.push('Longer passwords are much stronger — aim for 12+ characters.');
    }

    if (COMMON_PASSWORDS.has(lower)) {
      score = 0;
      warnings.push('This is a commonly used password.');
    }

    if (/^(.)\1+$/.test(password) || /0123|1234|2345|abcd|qwer/i.test(password)) {
      score = Math.min(score, 1);
      warnings.push('Avoid repeated characters and simple sequences.');
    }

    for (const input of userInputs) {
      const token = input?.split('@')[0]?.toLowerCase();
      if (token && token.length >= 3 && lower.includes(token)) {
        score = Math.min(score, 1);
        warnings.push('Avoid using your name or email in your password.');
        break;
      }
    }

    const clamped = Math.max(0, Math.min(4, score)) as PasswordStrengthResult['score'];
    return {
      score: clamped,
      label: STRENGTH_LABELS[clamped],
      warnings,
      suggestions,
      acceptable: clamped >= 2,
    };
  }

  /**
   * Throws when the password is too weak or known-breached. Call before hashing
   * on register / reset / change.
   */
  async assertAcceptable(password: string, userInputs: string[] = []): Promise<void> {
    const strength = this.evaluateStrength(password, userInputs);
    if (!strength.acceptable) {
      throw new BadRequestException(
        strength.warnings[0] ?? 'Password is too weak. Choose a stronger password.',
      );
    }
    if (await this.isBreached(password)) {
      throw new BadRequestException(
        'This password has appeared in a known data breach. Please choose a different one.',
      );
    }
  }

  /**
   * HaveIBeenPwned k-anonymity check: only the first 5 chars of the SHA-1 hash
   * leave the server. Disabled by default; enable via PASSWORD_BREACH_CHECK_ENABLED.
   */
  async isBreached(password: string): Promise<boolean> {
    if (!this.config.security.passwordBreachCheckEnabled) {
      return false;
    }
    try {
      const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
      });
      if (!response.ok) return false;
      const body = await response.text();
      return body
        .split('\n')
        .some((line) => line.split(':')[0]?.trim().toUpperCase() === suffix);
    } catch (error) {
      // Fail open on outage — never block a legitimate user on an external API.
      this.logger.warn('Password breach check failed', {
        context: 'PasswordService',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
