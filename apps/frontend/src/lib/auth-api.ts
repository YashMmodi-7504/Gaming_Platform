import type {
  ApiKeyCreated,
  ApiKeySummary,
  AuthTokens,
  DeviceSummary,
  LoginHistorySummary,
  PasswordStrengthResult,
  SecurityEventSummary,
  SessionSummary,
  TwoFactorSetup,
  TwoFactorStatus,
} from '@gaming-platform/types';

import { apiClient, setAccessToken, unwrap } from './api-client';

/** The auth user as returned by the API (richer than the shared domain User). */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionPayload {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginPayload {
  requiresTwoFactor: boolean;
  challengeToken?: string;
  session?: SessionPayload;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    unwrap<SessionPayload>(apiClient.post('/auth/register', data)),

  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    unwrap<LoginPayload>(apiClient.post('/auth/login', data)),

  verifyTwoFactorLogin: (data: { challengeToken: string; code: string }) =>
    unwrap<SessionPayload>(apiClient.post('/auth/2fa/verify', data)),

  refresh: () => unwrap<AuthTokens>(apiClient.post('/auth/refresh', {})),

  me: () => unwrap<AuthUser>(apiClient.get('/auth/me')),

  logout: () => unwrap<{ success: true }>(apiClient.post('/auth/logout', {})),

  logoutAll: () => unwrap<{ revoked: number }>(apiClient.post('/auth/logout-all', {})),

  verifyEmail: (token: string) =>
    unwrap<{ success: true }>(apiClient.post('/auth/verify-email', { token })),

  resendVerification: () =>
    unwrap<{ success: true }>(apiClient.post('/auth/resend-verification', {})),

  forgotPassword: (email: string) =>
    unwrap<{ success: true }>(apiClient.post('/auth/forgot-password', { email })),

  resetPassword: (token: string, password: string) =>
    unwrap<{ success: true }>(apiClient.post('/auth/reset-password', { token, password })),

  changePassword: (currentPassword: string, newPassword: string) =>
    unwrap<{ success: true }>(
      apiClient.post('/auth/change-password', { currentPassword, newPassword }),
    ),

  passwordStrength: (password: string) =>
    unwrap<PasswordStrengthResult>(apiClient.post('/auth/password/strength', { password })),

  // Sessions
  listSessions: () => unwrap<SessionSummary[]>(apiClient.get('/auth/sessions')),
  revokeSession: (id: string) =>
    unwrap<{ success: true }>(apiClient.delete(`/auth/sessions/${id}`)),
  revokeOtherSessions: () => unwrap<{ revoked: number }>(apiClient.delete('/auth/sessions')),

  // Devices
  listDevices: () => unwrap<DeviceSummary[]>(apiClient.get('/auth/devices')),
  trustDevice: (id: string, trusted: boolean) =>
    unwrap<DeviceSummary>(apiClient.patch(`/auth/devices/${id}/trust`, { trusted })),
  removeDevice: (id: string) =>
    unwrap<{ success: true }>(apiClient.delete(`/auth/devices/${id}`)),

  // Two-factor
  twoFactorStatus: () => unwrap<TwoFactorStatus>(apiClient.get('/auth/2fa/status')),
  twoFactorSetup: () => unwrap<TwoFactorSetup>(apiClient.post('/auth/2fa/setup', {})),
  twoFactorEnable: (code: string) =>
    unwrap<{ recoveryCodes: string[] }>(apiClient.post('/auth/2fa/enable', { code })),
  twoFactorDisable: (code: string) =>
    unwrap<{ success: true }>(apiClient.post('/auth/2fa/disable', { code })),
  regenerateRecoveryCodes: (code: string) =>
    unwrap<{ recoveryCodes: string[] }>(apiClient.post('/auth/2fa/recovery-codes', { code })),

  // Security feed
  loginHistory: () => unwrap<LoginHistorySummary[]>(apiClient.get('/auth/security/login-history')),
  securityEvents: () => unwrap<SecurityEventSummary[]>(apiClient.get('/auth/security/events')),

  // API keys
  listApiKeys: () => unwrap<ApiKeySummary[]>(apiClient.get('/auth/api-keys')),
  createApiKey: (data: { name: string; scopes?: string[]; expiresInDays?: number }) =>
    unwrap<ApiKeyCreated>(apiClient.post('/auth/api-keys', data)),
  revokeApiKey: (id: string) =>
    unwrap<{ success: true }>(apiClient.delete(`/auth/api-keys/${id}`)),
};

export { setAccessToken };
