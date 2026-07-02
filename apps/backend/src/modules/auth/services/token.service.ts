import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TOKEN_DEFAULTS } from '@gaming-platform/auth';
import type { UserRole } from '@gaming-platform/types';

import { AppConfigService } from '../../../config/app-config.service';
import { generateId } from '../../../common/security/crypto.util';
import { RedisService } from '../../redis/redis.service';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  roles: string[];
  permissions: string[];
  sid: string;
  type: 'access';
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
  family: string;
  type: 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface SignedToken {
  token: string;
  jti: string;
  expiresInSeconds: number;
}

const BLACKLIST_PREFIX = 'bl:access:';

/** Parse a JWT-style duration (e.g. `15m`, `7d`) into seconds. */
export function durationToSeconds(duration: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(duration.trim());
  if (!match) return 900;
  const value = Number(match[1] ?? '0');
  const unit = match[2] ?? 'm';
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}

/**
 * Issues and verifies JWTs and maintains the access-token blacklist in Redis
 * (keyed by jti, with a TTL bounded by the token's own lifetime).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
  ) {}

  async signAccessToken(claims: Omit<AccessTokenClaims, 'type' | 'jti'>): Promise<SignedToken> {
    const jti = generateId();
    const expiresIn = this.config.auth.accessExpiresIn;
    const token = await this.jwt.signAsync(
      { ...claims, type: 'access' },
      {
        secret: this.config.auth.accessSecret,
        expiresIn,
        jwtid: jti,
        issuer: TOKEN_DEFAULTS.ISSUER,
        audience: TOKEN_DEFAULTS.AUDIENCE,
      },
    );
    return { token, jti, expiresInSeconds: durationToSeconds(expiresIn) };
  }

  async signRefreshToken(
    claims: Omit<RefreshTokenClaims, 'type' | 'jti'>,
    expiresIn: string,
  ): Promise<SignedToken> {
    const jti = generateId();
    const token = await this.jwt.signAsync(
      { ...claims, type: 'refresh' },
      {
        secret: this.config.auth.refreshSecret,
        expiresIn,
        jwtid: jti,
        issuer: TOKEN_DEFAULTS.ISSUER,
        audience: TOKEN_DEFAULTS.AUDIENCE,
      },
    );
    return { token, jti, expiresInSeconds: durationToSeconds(expiresIn) };
  }

  verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    return this.jwt.verifyAsync<AccessTokenClaims>(token, {
      secret: this.config.auth.accessSecret,
      issuer: TOKEN_DEFAULTS.ISSUER,
      audience: TOKEN_DEFAULTS.AUDIENCE,
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    return this.jwt.verifyAsync<RefreshTokenClaims>(token, {
      secret: this.config.auth.refreshSecret,
      issuer: TOKEN_DEFAULTS.ISSUER,
      audience: TOKEN_DEFAULTS.AUDIENCE,
    });
  }

  /** Blacklist an access-token jti until its natural expiry. */
  async blacklistAccess(jti: string, expEpochSeconds?: number): Promise<void> {
    const ttl = expEpochSeconds
      ? Math.max(1, expEpochSeconds - Math.floor(Date.now() / 1000))
      : durationToSeconds(this.config.auth.accessExpiresIn);
    await this.redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', ttl);
  }

  isAccessBlacklisted(jti: string): Promise<boolean> {
    return this.redis.exists(`${BLACKLIST_PREFIX}${jti}`);
  }
}
