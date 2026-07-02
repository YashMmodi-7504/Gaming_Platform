export const PASSWORD_DEFAULTS = {
  SALT_ROUNDS: 12,
} as const;

export const TOKEN_DEFAULTS = {
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  ISSUER: 'gaming-platform',
  AUDIENCE: 'gaming-platform-clients',
} as const;
