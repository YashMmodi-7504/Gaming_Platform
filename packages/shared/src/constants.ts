/**
 * Platform-wide constants. Keep these framework-agnostic.
 */

export const APP_NAME = 'Gaming Platform' as const;

export const API_DEFAULT_VERSION = '1' as const;
export const API_DEFAULT_PREFIX = 'api' as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  /** At least one lowercase, one uppercase, one digit. */
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
} as const;

export const USERNAME_POLICY = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 24,
  PATTERN: /^[a-zA-Z0-9_]+$/,
} as const;

export const TOKEN = {
  ACCESS_DEFAULT_TTL: '15m',
  REFRESH_DEFAULT_TTL: '7d',
  BEARER_PREFIX: 'Bearer ',
} as const;

export const RATE_LIMIT = {
  DEFAULT_TTL_SECONDS: 60,
  DEFAULT_LIMIT: 120,
} as const;

export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  NOTIFICATION: 'notification',
  WALLET_UPDATE: 'wallet:update',
  TRANSACTION_UPDATE: 'transaction:update',
} as const;

export const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  wallet: (userId: string) => `wallet:${userId}`,
  session: (sid: string) => `session:${sid}`,
  gameList: 'games:list',
} as const;

export const DECIMAL_PRECISION = 8 as const;
