import type { Request } from 'express';

import { deviceFingerprint } from './crypto.util';

/**
 * Connection metadata extracted from an inbound request. Captured at the edge
 * of the auth flows for device tracking, geo/IP logging, and security events.
 */
export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string;
  fingerprintHint: string | null;
  /** Country code provided by an upstream proxy (Cloudflare / Nginx geo). */
  countryCode: string | null;
  city: string | null;
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Resolve the real client IP, honoring `x-forwarded-for` behind a proxy. */
export function resolveIp(req: Request): string | null {
  const forwarded = firstHeader(req.headers['x-forwarded-for']);
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

/** Build the {@link RequestMeta} snapshot for a request. */
export function extractRequestMeta(req: Request): RequestMeta {
  const userAgent = firstHeader(req.headers['user-agent']);
  const fingerprintHint = firstHeader(req.headers['x-device-fingerprint']);
  const countryCode =
    firstHeader(req.headers['cf-ipcountry']) ?? firstHeader(req.headers['x-geo-country']);
  const city = firstHeader(req.headers['x-geo-city']);

  return {
    ipAddress: resolveIp(req),
    userAgent,
    fingerprint: deviceFingerprint(fingerprintHint ?? undefined, userAgent ?? undefined),
    fingerprintHint,
    countryCode: countryCode ? countryCode.toUpperCase() : null,
    city,
  };
}
