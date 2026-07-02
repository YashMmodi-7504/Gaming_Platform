import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '@gaming-platform/types';
import { TOKEN_DEFAULTS } from '@gaming-platform/auth';

import { AppConfigService } from '../../../config/app-config.service';
import type { AccessTokenClaims } from '../services/token.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';

/**
 * Validates the access token: signature & expiry (passport), then revocation
 * (jti blacklist) and session liveness (the session may have been revoked from
 * another device). Attaches the full authorization context to the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.auth.accessSecret,
      issuer: TOKEN_DEFAULTS.ISSUER,
      audience: TOKEN_DEFAULTS.AUDIENCE,
    });
  }

  async validate(payload: AccessTokenClaims): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.jti && (await this.tokens.isAccessBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (payload.sid && !(await this.sessions.isActive(payload.sid))) {
      throw new UnauthorizedException('Session is no longer active');
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      sessionId: payload.sid,
      jti: payload.jti,
    };
  }
}
