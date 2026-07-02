import type { UUID } from './common';
import type { UserRole } from './enums';
import type { User } from './domain';

/**
 * Authentication contracts shared between the API and the web client.
 */

export interface JwtPayload {
  /** Subject — the user id. */
  sub: UUID;
  email: string;
  username: string;
  role: UserRole;
  /** All role slugs assigned to the user. */
  roles?: string[];
  /** Flattened permission slugs (resource:action) granted to the user. */
  permissions?: string[];
  /** Token type discriminator. */
  type: 'access' | 'refresh';
  /** Session id this token belongs to. */
  sid?: string;
  /** Unique token id (used for blacklisting / reuse detection). */
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: UUID;
  email: string;
  username: string;
  role: UserRole;
  /** All role slugs assigned to the user. */
  roles?: string[];
  /** Flattened permission slugs (resource:action). */
  permissions?: string[];
  /** Active session id the request was authenticated against. */
  sessionId?: string;
  /** Access-token id (jti) of the current request. */
  jti?: string;
}
