import { apiClient, unwrap } from './api-client';

export interface CardVariantSummary {
  key: string;
  name: string;
  evaluationMode: string;
  builtIn: boolean;
  enabled: boolean;
  sides: string[];
  betCount: number;
}

export interface CardBetDefinition {
  key: string;
  label: string;
  payout: number;
  description?: string;
}

export interface CardRuleSet {
  key: string;
  name: string;
  evaluationMode: string;
  interactive: boolean;
  sides: string[];
  bets: CardBetDefinition[];
  sideBets: CardBetDefinition[];
  betLimits: { min: number; max: number };
  roundTimerMs: number;
}

export interface CardSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface CardRoundResult {
  roundId: string;
  variant: string;
  mode: string;
  hands: Record<string, string[]>;
  community: string[];
  winners: string[];
  isTie: boolean;
  winningBets: string[];
  pushBets: string[];
  settlement: {
    bets: Array<{ key: string; amount: string; outcome: string; returned: string }>;
    totalBet: string;
    totalWin: string;
    net: string;
  };
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

export interface CardBet {
  key: string;
  amount: string;
}

export const cardApi = {
  variants: () => unwrap<CardVariantSummary[]>(apiClient.get('/card/variants')),
  variant: (key: string) => unwrap<CardRuleSet>(apiClient.get(`/card/variants/${key}`)),

  createSession: (data: { variantKey: string; gameId?: string; mode?: string; clientSeed?: string }) =>
    unwrap<{ session: CardSessionView; ruleset: CardRuleSet }>(apiClient.post('/card/sessions', data)),
  getSession: (id: string) => unwrap<CardSessionView>(apiClient.get(`/card/sessions/${id}`)),
  playRound: (id: string, bets: CardBet[]) =>
    unwrap<CardRoundResult>(apiClient.post(`/card/sessions/${id}/round`, { bets })),

  bjDeal: (id: string, bets: CardBet[]) =>
    unwrap<{ player: string[]; dealerUp: string[] }>(apiClient.post(`/card/sessions/${id}/bj/deal`, { bets })),
  bjHit: (id: string) =>
    unwrap<{ player: string[]; value: number; busted: boolean; result: CardRoundResult | null }>(
      apiClient.post(`/card/sessions/${id}/bj/hit`, {}),
    ),
  bjStand: (id: string) => unwrap<CardRoundResult>(apiClient.post(`/card/sessions/${id}/bj/stand`, {})),

  history: (id: string) =>
    unwrap<Array<{ id: string; roundId: string; outcome: string; betAmount: string; winAmount: string; createdAt: string }>>(
      apiClient.get(`/card/sessions/${id}/history`),
    ),
  fairness: (id: string) =>
    unwrap<{ serverSeedHash: string; clientSeed: string; nonce: number }>(
      apiClient.get(`/card/sessions/${id}/fairness`),
    ),
  end: (id: string) =>
    unwrap<{ ended: true; fairness: { serverSeed: string; clientSeed: string; finalNonce: number } }>(
      apiClient.post(`/card/sessions/${id}/end`, {}),
    ),

  verifyShuffle: (seed: string, decks = 1, jokersPerDeck = 0) =>
    unwrap<{ seed: string; shuffledDeck: string[] }>(
      apiClient.post('/card/verify-shuffle', { seed, decks, jokersPerDeck }),
    ),
};

export interface CardEngineStatistics {
  totalVariants: number;
  builtIn: number;
  custom: number;
  disabled: number;
  replays: number;
  savedStates: number;
}

export interface AdminCardReplay {
  id: string;
  sessionId: string;
  seed: string;
  frameCount: number;
  durationMs: number;
  createdAt: string;
}

export const adminCardApi = {
  variants: () => unwrap<CardVariantSummary[]>(apiClient.get('/admin/card/variants')),
  statistics: () => unwrap<CardEngineStatistics>(apiClient.get('/admin/card/statistics')),
  replays: () => unwrap<AdminCardReplay[]>(apiClient.get('/admin/card/replays')),

  create: (data: { key: string; name: string; rules: Record<string, unknown> }) =>
    unwrap<CardVariantSummary>(apiClient.post('/admin/card/variants', data)),
  update: (key: string, data: { name?: string; rules?: Record<string, unknown> }) =>
    unwrap<CardVariantSummary>(apiClient.put(`/admin/card/variants/${key}`, data)),
  enable: (key: string) => unwrap<unknown>(apiClient.post(`/admin/card/variants/${key}/enable`, {})),
  disable: (key: string) =>
    unwrap<unknown>(apiClient.post(`/admin/card/variants/${key}/disable`, {})),
  remove: (key: string) => unwrap<unknown>(apiClient.delete(`/admin/card/variants/${key}`)),
};
