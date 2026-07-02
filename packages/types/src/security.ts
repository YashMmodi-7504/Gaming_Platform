import type { AuthSession } from './auth';
import type { ISODateString, Nullable, UUID } from './common';

/**
 * Account-security contracts shared between the API and the web client
 * (active sessions, trusted devices, two-factor, API keys, security log).
 */

export interface SessionSummary {
  id: UUID;
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
  deviceName: Nullable<string>;
  location: Nullable<string>;
  current: boolean;
  lastActivityAt: Nullable<ISODateString>;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}

export interface DeviceSummary {
  id: UUID;
  name: Nullable<string>;
  type: string;
  os: Nullable<string>;
  browser: Nullable<string>;
  ipAddress: Nullable<string>;
  isTrusted: boolean;
  lastUsedAt: Nullable<ISODateString>;
  createdAt: ISODateString;
}

export interface SecurityEventSummary {
  id: UUID;
  type: string;
  severity: string;
  description: Nullable<string>;
  ipAddress: Nullable<string>;
  createdAt: ISODateString;
}

export interface LoginHistorySummary {
  id: UUID;
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
  success: boolean;
  failureReason: Nullable<string>;
  location: Nullable<string>;
  createdAt: ISODateString;
}

export interface TwoFactorSetup {
  /** otpauth:// URI used to provision an authenticator app. */
  otpauthUrl: string;
  /** Data-URL PNG of the QR code encoding the otpauth URI. */
  qrCodeDataUrl: string;
  /** Base32 secret, shown for manual entry. */
  secret: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  methods: string[];
  recoveryCodesRemaining: number;
}

export interface ApiKeySummary {
  id: UUID;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: Nullable<ISODateString>;
  expiresAt: Nullable<ISODateString>;
  createdAt: ISODateString;
}

/** Returned once on creation — the plaintext key is never persisted or shown again. */
export interface ApiKeyCreated extends ApiKeySummary {
  key: string;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  warnings: string[];
  suggestions: string[];
  acceptable: boolean;
}

export interface LoginResult {
  /** When true, the client must complete a two-factor challenge before tokens are issued. */
  requiresTwoFactor: boolean;
  /** Short-lived challenge token used to complete the two-factor step. */
  challengeToken?: string;
  session?: AuthSession;
}
