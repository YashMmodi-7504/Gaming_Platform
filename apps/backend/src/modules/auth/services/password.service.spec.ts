import type { Logger } from 'winston';

import type { AppConfigService } from '../../../config/app-config.service';
import { PasswordService } from './password.service';

const config = {
  auth: { saltRounds: 10 },
  security: { passwordBreachCheckEnabled: false },
} as unknown as AppConfigService;

const logger = { warn: jest.fn() } as unknown as Logger;

describe('PasswordService', () => {
  const service = new PasswordService(config, logger);

  describe('evaluateStrength', () => {
    it('rates a short, single-class password as very weak', () => {
      const result = service.evaluateStrength('abcdefg');
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.acceptable).toBe(false);
    });

    it('rates a long, mixed-class password as strong', () => {
      const result = service.evaluateStrength('Str0ng&Unique!Pass');
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.acceptable).toBe(true);
    });

    it('rejects common passwords', () => {
      const result = service.evaluateStrength('password123');
      expect(result.score).toBe(0);
      expect(result.acceptable).toBe(false);
    });

    it('penalizes passwords derived from user identifiers', () => {
      const result = service.evaluateStrength('Johnsmith2024', ['johnsmith@example.com']);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('assertAcceptable', () => {
    it('throws for a weak password', async () => {
      await expect(service.assertAcceptable('weak')).rejects.toThrow();
    });

    it('accepts a strong password', async () => {
      await expect(service.assertAcceptable('Str0ng&Unique!Pass')).resolves.toBeUndefined();
    });
  });

  describe('hash / verify', () => {
    it('produces a verifiable hash', async () => {
      const hash = await service.hash('Str0ng&Unique!Pass');
      expect(hash).not.toEqual('Str0ng&Unique!Pass');
      await expect(service.verify('Str0ng&Unique!Pass', hash)).resolves.toBe(true);
      await expect(service.verify('wrong', hash)).resolves.toBe(false);
    });
  });

  describe('isBreached', () => {
    it('returns false when breach checking is disabled', async () => {
      await expect(service.isBreached('password')).resolves.toBe(false);
    });
  });
});
