import { apiClient, unwrap } from './api-client';

export interface DiceVariantSummary {
  key: string;
  name: string;
  builtIn: boolean;
  enabled: boolean;
  diceCount: number;
  faces: number;
  betCount: number;
  totalRange: { min: number; max: number };
  houseRules: { triplesBeatBigSmall: boolean; triplesBeatOddEven: boolean };
  limits: { min: number; max: number; tableMax: number };
}

export interface DiceBetDefinition {
  key: string;
  label: string;
  category: string;
  match: string;
  payout: number;
  values?: number[];
  perOccurrence?: boolean;
  description?: string;
}

export interface DiceRuleSet {
  key: string;
  name: string;
  diceCount: number;
  faces: number;
  bets: DiceBetDefinition[];
  limits: { min: number; max: number; tableMax: number };
  roundTimerMs: number;
  houseRules: { triplesBeatBigSmall: boolean; triplesBeatOddEven: boolean };
}

export interface DiceSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface DiceBet {
  type: string;
  amount: string;
}

export interface DiceRoundResult {
  roundId: string;
  variant: string;
  mode: 'dice';
  values: number[];
  total: number;
  isTriple: boolean;
  spins: number[];
  winningBets: string[];
  settlement: {
    bets: Array<{ type: string; amount: string; outcome: string; payout: number; returned: string }>;
    totalBet: string;
    totalWin: string;
    net: string;
  };
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

export const diceApi = {
  variants: () => unwrap<DiceVariantSummary[]>(apiClient.get('/dice/variants')),
  variant: (key: string) => unwrap<DiceRuleSet>(apiClient.get(`/dice/variants/${key}`)),

  createSession: (data: { variantKey: string; gameId?: string; mode?: string; clientSeed?: string }) =>
    unwrap<{ session: DiceSessionView; ruleset: DiceRuleSet }>(apiClient.post('/dice/sessions', data)),
  getSession: (id: string) => unwrap<DiceSessionView>(apiClient.get(`/dice/sessions/${id}`)),
  roll: (id: string, bets: DiceBet[]) =>
    unwrap<DiceRoundResult>(apiClient.post(`/dice/sessions/${id}/roll`, { bets })),

  history: (id: string) =>
    unwrap<
      Array<{
        id: string;
        roundId: string;
        outcome: string;
        betAmount: string;
        winAmount: string;
        payload: { values: number[]; total: number } | null;
        createdAt: string;
      }>
    >(apiClient.get(`/dice/sessions/${id}/history`)),
  fairness: (id: string) =>
    unwrap<{ serverSeedHash: string; clientSeed: string; nonce: number }>(
      apiClient.get(`/dice/sessions/${id}/fairness`),
    ),
  end: (id: string) =>
    unwrap<{ ended: true; fairness: { serverSeed: string; clientSeed: string; finalNonce: number } }>(
      apiClient.post(`/dice/sessions/${id}/end`, {}),
    ),

  verifyRoll: (variantKey: string, seed: string) =>
    unwrap<{ seed: string; diceCount: number; faces: number; values: number[]; total: number }>(
      apiClient.post('/dice/verify-roll', { variantKey, seed }),
    ),
};

export interface DiceEngineStatistics {
  totalVariants: number;
  builtIn: number;
  custom: number;
  disabled: number;
  replays: number;
  savedStates: number;
}

export interface AdminDiceReplay {
  id: string;
  sessionId: string;
  seed: string;
  frameCount: number;
  durationMs: number;
  createdAt: string;
}

export const adminDiceApi = {
  variants: () => unwrap<DiceVariantSummary[]>(apiClient.get('/admin/dice/variants')),
  statistics: () => unwrap<DiceEngineStatistics>(apiClient.get('/admin/dice/statistics')),
  replays: () => unwrap<AdminDiceReplay[]>(apiClient.get('/admin/dice/replays')),

  create: (data: { key: string; name: string; rules: Record<string, unknown> }) =>
    unwrap<DiceVariantSummary>(apiClient.post('/admin/dice/variants', data)),
  update: (key: string, data: { name?: string; rules?: Record<string, unknown> }) =>
    unwrap<DiceVariantSummary>(apiClient.put(`/admin/dice/variants/${key}`, data)),
  enable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/dice/variants/${key}/enable`, {})),
  disable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/dice/variants/${key}/disable`, {})),
  remove: (key: string) => unwrap<unknown>(apiClient.delete(`/admin/dice/variants/${key}`)),
};
