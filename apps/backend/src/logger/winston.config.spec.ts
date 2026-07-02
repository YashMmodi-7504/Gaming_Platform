import { redactValue } from './winston.config';

/**
 * RC2 security control — verifies the logger redaction format scrubs sensitive
 * fields (passwords, tokens, seeds, keys) at any nesting depth before any
 * transport writes them (OWASP A09: sensitive data exposure in logs).
 */
describe('log redaction', () => {
  it('redacts sensitive top-level and nested fields', () => {
    const input = {
      message: 'login',
      username: 'alice',
      password: 'hunter2',
      meta: { accessToken: 'jwt.abc.def', nested: { refreshToken: 'r1', clientSeed: 'seed' } },
      authorization: 'Bearer xyz',
    };
    const out = redactValue(input) as Record<string, unknown>;
    expect(out.username).toBe('alice');
    expect(out.password).toBe('[REDACTED]');
    expect(out.authorization).toBe('[REDACTED]');
    const meta = out.meta as Record<string, unknown>;
    expect(meta.accessToken).toBe('[REDACTED]');
    expect((meta.nested as Record<string, unknown>).refreshToken).toBe('[REDACTED]');
    expect((meta.nested as Record<string, unknown>).clientSeed).toBe('[REDACTED]');
  });

  it('is case-insensitive and leaves arrays/primitives intact', () => {
    const out = redactValue({ Password: 'x', items: [1, 2, 3], ok: true }) as Record<string, unknown>;
    expect(out.Password).toBe('[REDACTED]');
    expect(out.items).toEqual([1, 2, 3]);
    expect(out.ok).toBe(true);
  });
});
