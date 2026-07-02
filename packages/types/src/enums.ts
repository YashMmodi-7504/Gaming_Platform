/**
 * Shared enums describing platform-wide domain states.
 * These are framework-agnostic and safe to import on client and server.
 */

export enum UserRole {
  USER = 'USER',
  VIP = 'VIP',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

export enum GameStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ARCHIVED = 'ARCHIVED',
}

export enum GameCategory {
  SLOTS = 'SLOTS',
  TABLE = 'TABLE',
  LIVE = 'LIVE',
  CRASH = 'CRASH',
  INSTANT = 'INSTANT',
  ARCADE = 'ARCADE',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET = 'BET',
  WIN = 'WIN',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  TRANSACTION = 'TRANSACTION',
  PROMOTION = 'PROMOTION',
  SECURITY = 'SECURITY',
  GAME = 'GAME',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}
