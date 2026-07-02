import type { JwtPayload as AppJwtPayload } from '@gaming-platform/types';
import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';

import { TOKEN_DEFAULTS } from './constants';

export interface TokenConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn?: string;
  refreshExpiresIn?: string;
  issuer?: string;
  audience?: string;
}

type SignablePayload = Omit<AppJwtPayload, 'iat' | 'exp'>;

const baseSignOptions = (config: TokenConfig): SignOptions => ({
  issuer: config.issuer ?? TOKEN_DEFAULTS.ISSUER,
  audience: config.audience ?? TOKEN_DEFAULTS.AUDIENCE,
});

/**
 * Sign a short-lived access token.
 */
export const signAccessToken = (
  payload: Omit<SignablePayload, 'type'>,
  config: TokenConfig,
): string =>
  jwt.sign({ ...payload, type: 'access' } satisfies SignablePayload, config.accessSecret, {
    ...baseSignOptions(config),
    expiresIn: (config.accessExpiresIn ?? TOKEN_DEFAULTS.ACCESS_EXPIRES_IN) as SignOptions['expiresIn'],
  });

/**
 * Sign a long-lived refresh token. `sid` ties the token to a session family
 * so it can be rotated and revoked.
 */
export const signRefreshToken = (
  payload: Omit<SignablePayload, 'type'>,
  config: TokenConfig,
): string =>
  jwt.sign({ ...payload, type: 'refresh' } satisfies SignablePayload, config.refreshSecret, {
    ...baseSignOptions(config),
    expiresIn: (config.refreshExpiresIn ?? TOKEN_DEFAULTS.REFRESH_EXPIRES_IN) as SignOptions['expiresIn'],
  });

const verifyOptions = (config: TokenConfig): VerifyOptions => ({
  issuer: config.issuer ?? TOKEN_DEFAULTS.ISSUER,
  audience: config.audience ?? TOKEN_DEFAULTS.AUDIENCE,
});

export const verifyAccessToken = (token: string, config: TokenConfig): AppJwtPayload =>
  jwt.verify(token, config.accessSecret, verifyOptions(config)) as AppJwtPayload;

export const verifyRefreshToken = (token: string, config: TokenConfig): AppJwtPayload =>
  jwt.verify(token, config.refreshSecret, verifyOptions(config)) as AppJwtPayload;

export const decodeToken = (token: string): AppJwtPayload | null =>
  jwt.decode(token) as AppJwtPayload | null;
