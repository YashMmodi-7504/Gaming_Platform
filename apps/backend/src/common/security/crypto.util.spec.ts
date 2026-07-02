import {
  deviceFingerprint,
  generateApiKey,
  generateRecoveryCodes,
  generateToken,
  safeEqual,
  sha256,
} from './crypto.util';

describe('crypto.util', () => {
  it('hashes deterministically', () => {
    expect(sha256('abc')).toEqual(sha256('abc'));
    expect(sha256('abc')).not.toEqual(sha256('abd'));
  });

  it('generates unique URL-safe tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates an API key with a stored digest', () => {
    const { key, prefix, keyHash } = generateApiKey();
    expect(key.startsWith('gp_')).toBe(true);
    expect(key).toContain(prefix);
    expect(keyHash).toEqual(sha256(key));
  });

  it('generates the requested number of recovery codes', () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    codes.forEach((c) => expect(c).toMatch(/^\d{4}-\d{4}$/));
  });

  it('compares strings in constant time', () => {
    expect(safeEqual('secret', 'secret')).toBe(true);
    expect(safeEqual('secret', 'secreta')).toBe(false);
    expect(safeEqual('secret', 'wrongx')).toBe(false);
  });

  it('produces a stable fingerprint for the same inputs', () => {
    expect(deviceFingerprint('hint', 'ua')).toEqual(deviceFingerprint('hint', 'ua'));
    expect(deviceFingerprint('hint', 'ua')).not.toEqual(deviceFingerprint('other', 'ua'));
  });
});
