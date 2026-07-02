import { apiClient, unwrap } from './api-client';

export interface CrashVariantSummary {
  key: string;
  name: string;
  builtIn: boolean;
  enabled: boolean;
  minMultiplier: number;
  maxMultiplier: number;
  houseEdge: number;
  volatility: number;
  limits: { min: number; max: number; tableMax: number };
}

export interface CrashRuleSet {
  key: string;
  name: string;
  minMultiplier: number;
  maxMultiplier: number;
  houseEdge: number;
  volatility: number;
  growthRatePerSecond: number;
  tickMs: number;
  roundDurationCapMs: number;
  bettingWindowMs: number;
  allowAutoCashout: boolean;
  allowManualCashout: boolean;
  maxPayout: number;
  limits: { min: number; max: number; tableMax: number };
}

export interface CrashSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface CrashRoundResult {
  roundId: string;
  variant: string;
  mode: 'crash';
  crashPoint: number;
  crashTimeMs: number;
  cashouts: number[];
  instantBust: boolean;
  settlement: {
    bets: Array<{
      amount: string;
      autoCashout: number | null;
      cashedOutAt: number | null;
      outcome: string;
      payout: number;
      returned: string;
    }>;
    totalBet: string;
    totalWin: string;
    net: string;
  };
  curve: { crashPoint: number; crashTimeMs: number; points: Array<{ tMs: number; multiplier: number }> };
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

export interface RoundStartView {
  roundId: string;
  startedAt: number;
  serverSeedHash: string;
  nonce: number;
}

export const crashApi = {
  variants: () => unwrap<CrashVariantSummary[]>(apiClient.get('/crash/variants')),
  variant: (key: string) => unwrap<CrashRuleSet>(apiClient.get(`/crash/variants/${key}`)),

  createSession: (data: { variantKey: string; gameId?: string; mode?: string; clientSeed?: string }) =>
    unwrap<{ session: CrashSessionView; ruleset: CrashRuleSet }>(apiClient.post('/crash/sessions', data)),
  getSession: (id: string) => unwrap<CrashSessionView>(apiClient.get(`/crash/sessions/${id}`)),

  start: (id: string, amount: string, autoCashout?: number) =>
    unwrap<RoundStartView>(apiClient.post(`/crash/sessions/${id}/start`, { amount, autoCashout })),
  cashout: (id: string) => unwrap<CrashRoundResult>(apiClient.post(`/crash/sessions/${id}/cashout`, {})),
  resolve: (id: string) => unwrap<CrashRoundResult>(apiClient.post(`/crash/sessions/${id}/resolve`, {})),

  history: (id: string) =>
    unwrap<
      Array<{
        id: string;
        roundId: string;
        outcome: string;
        betAmount: string;
        winAmount: string;
        payload: { crashPoint: number; cashouts: number[] } | null;
        createdAt: string;
      }>
    >(apiClient.get(`/crash/sessions/${id}/history`)),
  fairness: (id: string) =>
    unwrap<{ serverSeedHash: string; clientSeed: string; nonce: number }>(
      apiClient.get(`/crash/sessions/${id}/fairness`),
    ),
  end: (id: string) =>
    unwrap<{ ended: true; fairness: { serverSeed: string; clientSeed: string; finalNonce: number } }>(
      apiClient.post(`/crash/sessions/${id}/end`, {}),
    ),

  verifyCrash: (variantKey: string, seed: string) =>
    unwrap<{ seed: string; uniform: number; crashPoint: number }>(
      apiClient.post('/crash/verify-crash', { variantKey, seed }),
    ),
};

export interface CrashEngineStatistics {
  totalVariants: number;
  builtIn: number;
  custom: number;
  disabled: number;
  replays: number;
  savedStates: number;
}

export interface AdminCrashReplay {
  id: string;
  sessionId: string;
  seed: string;
  frameCount: number;
  durationMs: number;
  createdAt: string;
}

export const adminCrashApi = {
  variants: () => unwrap<CrashVariantSummary[]>(apiClient.get('/admin/crash/variants')),
  statistics: () => unwrap<CrashEngineStatistics>(apiClient.get('/admin/crash/statistics')),
  replays: () => unwrap<AdminCrashReplay[]>(apiClient.get('/admin/crash/replays')),

  create: (data: { key: string; name: string; rules: Record<string, unknown> }) =>
    unwrap<CrashVariantSummary>(apiClient.post('/admin/crash/variants', data)),
  update: (key: string, data: { name?: string; rules?: Record<string, unknown> }) =>
    unwrap<CrashVariantSummary>(apiClient.put(`/admin/crash/variants/${key}`, data)),
  enable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/crash/variants/${key}/enable`, {})),
  disable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/crash/variants/${key}/disable`, {})),
  remove: (key: string) => unwrap<unknown>(apiClient.delete(`/admin/crash/variants/${key}`)),
};
