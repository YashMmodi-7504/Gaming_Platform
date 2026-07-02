import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Cryptographic helpers used across the auth subsystem. All token material is
 * generated with the CSPRNG and only ever stored as a SHA-256 digest.
 */

/** Generate a URL-safe random token (default 32 bytes → 43 chars base64url). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** A fresh UUID (v4) — used for jti / session family identifiers. */
export function generateId(): string {
  return randomUUID();
}

/** SHA-256 hex digest. Used to store opaque tokens at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time comparison of two strings of arbitrary length. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep timing roughly constant, then fail.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface GeneratedApiKey {
  /** Public, non-secret prefix used to identify the key (stored in clear). */
  prefix: string;
  /** The full secret presented to the caller exactly once. */
  key: string;
  /** SHA-256 digest of the full key, stored at rest. */
  keyHash: string;
}

/** Generate an API key as `gp_<prefix>_<secret>` and its stored digest. */
export function generateApiKey(): GeneratedApiKey {
  const prefix = randomBytes(6).toString('hex');
  const secret = generateToken(32);
  const key = `gp_${prefix}_${secret}`;
  return { prefix, key, keyHash: sha256(key) };
}

/** Generate `count` numeric recovery codes (e.g. `4821-9173`). */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const a = randomInt(0, 10000).toString().padStart(4, '0');
    const b = randomInt(0, 10000).toString().padStart(4, '0');
    return `${a}-${b}`;
  });
}

/** Stable device fingerprint from a client-supplied hint and the user agent. */
export function deviceFingerprint(hint: string | undefined, userAgent: string | undefined): string {
  return sha256(`${hint ?? ''}::${userAgent ?? ''}`);
}
