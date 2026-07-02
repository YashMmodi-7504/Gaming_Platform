import type { Identifiable, ISODateString, Nullable, Timestamped } from './common';
import type {
  Currency,
  GameCategory,
  GameStatus,
  NotificationChannel,
  NotificationType,
  TransactionStatus,
  TransactionType,
  UserRole,
  UserStatus,
} from './enums';

/**
 * Domain entity shapes shared between client and server. These describe the
 * public API contracts — they are intentionally decoupled from the Prisma
 * models so the database layer can evolve independently.
 */

export interface User extends Identifiable, Timestamped {
  email: string;
  username: string;
  displayName: Nullable<string>;
  avatarUrl: Nullable<string>;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Nullable<ISODateString>;
}

export interface Wallet extends Identifiable, Timestamped {
  userId: string;
  currency: Currency;
  /** Balance is represented as a string to preserve decimal precision. */
  balance: string;
  lockedBalance: string;
  isPrimary: boolean;
}

export interface Game extends Identifiable, Timestamped {
  slug: string;
  name: string;
  description: Nullable<string>;
  category: GameCategory;
  status: GameStatus;
  thumbnailUrl: Nullable<string>;
  provider: string;
  minBet: string;
  maxBet: string;
  rtp: number;
  isFeatured: boolean;
}

export interface Transaction extends Identifiable, Timestamped {
  userId: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  currency: Currency;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reference: string;
  description: Nullable<string>;
  metadata: Nullable<Record<string, unknown>>;
}

export interface Notification extends Identifiable, Timestamped {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  isRead: boolean;
  readAt: Nullable<ISODateString>;
  data: Nullable<Record<string, unknown>>;
}
