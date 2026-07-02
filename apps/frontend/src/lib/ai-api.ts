import { apiClient, unwrap } from './api-client';

export interface RecGame {
  id: string;
  slug: string;
  name: string;
  category: string;
  rtp: number;
  popularity: number;
  isTrending: boolean;
}

export interface ForYou {
  recommended: RecGame[];
  trending: RecGame[];
  recentlyPlayed: RecGame[];
  continuePlaying: RecGame[];
  tournaments: Array<{ id: string; name: string; status: string; prizePool: string }>;
}

export interface SearchResult {
  intent: {
    entity: string;
    filters: Record<string, unknown>;
    sort?: string;
    keywords: string[];
  };
  results: unknown[];
}

export interface AiAnswer {
  question: string;
  topic: string;
  facts: string;
  answer: string;
  provider: string;
}

export interface FraudAssessment {
  userId: string;
  score: number;
  band: string;
  signals: Array<{ type: string; severity: string; score: number; detail: string }>;
}

export interface RiskProfile {
  userId: string;
  risk: { score: number; band: string };
  responsibleGaming: Array<{ code: string; message: string; severity: string }>;
  fraud: { score: number; band: string };
  segment: string;
  churnProbability: number;
  retentionAction: string;
}

export const aiApi = {
  forYou: () => unwrap<ForYou>(apiClient.get('/ai/for-you')),
  trending: () => unwrap<RecGame[]>(apiClient.get('/ai/trending')),
  similar: (gameId: string) => unwrap<RecGame[]>(apiClient.get(`/ai/similar/${gameId}`)),
  search: (query: string) => unwrap<SearchResult>(apiClient.post('/ai/search', { query })),
};

export const adminAiApi = {
  ask: (question: string, userId?: string) => unwrap<AiAnswer>(apiClient.post('/admin/ai/ask', { question, userId })),
  revenue: (hours = 24) => unwrap<AiAnswer>(apiClient.get(`/admin/ai/insights/revenue?hours=${hours}`)),
  tournaments: () => unwrap<AiAnswer>(apiClient.get('/admin/ai/insights/tournaments')),
  wallet: () => unwrap<AiAnswer>(apiClient.get('/admin/ai/insights/wallet')),
  alerts: () => unwrap<AiAnswer>(apiClient.get('/admin/ai/insights/alerts')),
  report: () => unwrap<AiAnswer>(apiClient.post('/admin/ai/report', {})),
  fraudScan: (limit = 50) => unwrap<FraudAssessment[]>(apiClient.get(`/admin/ai/fraud/scan?limit=${limit}`)),
  fraudAssess: (userId: string) => unwrap<FraudAssessment>(apiClient.get(`/admin/ai/fraud/${userId}`)),
  riskProfile: (userId: string) => unwrap<RiskProfile>(apiClient.get(`/admin/ai/risk/${userId}`)),
};
