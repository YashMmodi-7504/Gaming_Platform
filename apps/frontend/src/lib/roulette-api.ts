import { apiClient, unwrap } from './api-client';

export type RouletteColor = 'red' | 'black' | 'green';

export interface RouletteVariantSummary {
  key: string;
  name: string;
  builtIn: boolean;
  enabled: boolean;
  pockets: number;
  zeroCount: number;
  betTypeCount: number;
  houseRules: { laPartage: boolean; enPrison: boolean };
  limits: { min: number; max: number; tableMax: number };
}

export interface RouletteBetType {
  key: string;
  label: string;
  category: 'inside' | 'outside';
  match: string;
  payout: number;
  selectionSize?: number;
  description?: string;
}

export interface RouletteWheelLayout {
  sequence: number[];
  redNumbers: number[];
  greenPockets: number[];
  maxNumber: number;
  dozenSize: number;
  columnStride: number;
  lowRange: [number, number];
  highRange: [number, number];
}

export interface RouletteRuleSet {
  key: string;
  name: string;
  layout: RouletteWheelLayout;
  betTypes: RouletteBetType[];
  limits: { min: number; max: number; tableMax: number };
  roundTimerMs: number;
  houseRules: { laPartage: boolean; enPrison: boolean };
}

export interface RouletteSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface RouletteBet {
  type: string;
  amount: string;
  selection?: number[];
}

export interface RouletteRoundResult {
  roundId: string;
  variant: string;
  mode: 'roulette';
  pocket: number;
  pocketLabel: string;
  color: RouletteColor;
  sequenceIndex: number;
  rotation: number;
  winningBets: string[];
  settlement: {
    bets: Array<{
      type: string;
      amount: string;
      selection: number[];
      outcome: string;
      payout: number;
      returned: string;
    }>;
    totalBet: string;
    totalWin: string;
    net: string;
  };
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

export const rouletteApi = {
  variants: () => unwrap<RouletteVariantSummary[]>(apiClient.get('/roulette/variants')),
  variant: (key: string) => unwrap<RouletteRuleSet>(apiClient.get(`/roulette/variants/${key}`)),

  createSession: (data: { variantKey: string; gameId?: string; mode?: string; clientSeed?: string }) =>
    unwrap<{ session: RouletteSessionView; ruleset: RouletteRuleSet }>(
      apiClient.post('/roulette/sessions', data),
    ),
  getSession: (id: string) => unwrap<RouletteSessionView>(apiClient.get(`/roulette/sessions/${id}`)),
  spin: (id: string, bets: RouletteBet[]) =>
    unwrap<RouletteRoundResult>(apiClient.post(`/roulette/sessions/${id}/spin`, { bets })),

  history: (id: string) =>
    unwrap<
      Array<{
        id: string;
        roundId: string;
        outcome: string;
        betAmount: string;
        winAmount: string;
        payload: { pocket: number; label: string; color: RouletteColor } | null;
        createdAt: string;
      }>
    >(apiClient.get(`/roulette/sessions/${id}/history`)),
  fairness: (id: string) =>
    unwrap<{ serverSeedHash: string; clientSeed: string; nonce: number }>(
      apiClient.get(`/roulette/sessions/${id}/fairness`),
    ),
  end: (id: string) =>
    unwrap<{ ended: true; fairness: { serverSeed: string; clientSeed: string; finalNonce: number } }>(
      apiClient.post(`/roulette/sessions/${id}/end`, {}),
    ),

  verifySpin: (variantKey: string, seed: string) =>
    unwrap<{ seed: string; index: number; pocket: number; label: string; color: string; sequence: number[] }>(
      apiClient.post('/roulette/verify-spin', { variantKey, seed }),
    ),
};

export interface RouletteEngineStatistics {
  totalVariants: number;
  builtIn: number;
  custom: number;
  disabled: number;
  replays: number;
  savedStates: number;
}

export interface AdminRouletteReplay {
  id: string;
  sessionId: string;
  seed: string;
  frameCount: number;
  durationMs: number;
  createdAt: string;
}

export const adminRouletteApi = {
  variants: () => unwrap<RouletteVariantSummary[]>(apiClient.get('/admin/roulette/variants')),
  statistics: () => unwrap<RouletteEngineStatistics>(apiClient.get('/admin/roulette/statistics')),
  replays: () => unwrap<AdminRouletteReplay[]>(apiClient.get('/admin/roulette/replays')),

  create: (data: { key: string; name: string; rules: Record<string, unknown> }) =>
    unwrap<RouletteVariantSummary>(apiClient.post('/admin/roulette/variants', data)),
  update: (key: string, data: { name?: string; rules?: Record<string, unknown> }) =>
    unwrap<RouletteVariantSummary>(apiClient.put(`/admin/roulette/variants/${key}`, data)),
  enable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/roulette/variants/${key}/enable`, {})),
  disable: (key: string) =>
    unwrap<unknown>(apiClient.post(`/admin/roulette/variants/${key}/disable`, {})),
  remove: (key: string) => unwrap<unknown>(apiClient.delete(`/admin/roulette/variants/${key}`)),
};
