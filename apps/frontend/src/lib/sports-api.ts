import { apiClient, unwrap } from './api-client';

export interface SportDefinition {
  key: string;
  name: string;
  category: string;
  hasDraw: boolean;
  participantNoun: string;
  marketTypes: string[];
}

export interface MarketTemplate {
  key: string;
  name: string;
  settlement: 'outright' | 'line';
  description: string;
  selectionKind: string;
  supportsLine: boolean;
}

export interface Competition {
  key: string;
  sportKey: string;
  name: string;
  region: string;
  season?: string;
  tournament?: string;
}

export interface Selection {
  id: string;
  name: string;
  odds: number;
  status: string;
  line?: number;
  side?: string;
}

export interface Market {
  id: string;
  templateKey: string;
  name: string;
  settlement: 'outright' | 'line';
  status: string;
  selections: Selection[];
  line?: number;
}

export interface Participant {
  id: string;
  name: string;
  short?: string;
  side?: string;
}

export interface Match {
  id: string;
  competitionKey: string;
  sportKey: string;
  name: string;
  participants: Participant[];
  startTime: string;
  status: string;
  markets: Market[];
}

export interface BetSelection {
  matchId: string;
  marketId: string;
  selectionId: string;
  odds: number;
  status: string;
  matchName?: string;
  marketName?: string;
  selectionName?: string;
}

export interface BetSlip {
  betId: string;
  type: string;
  stake: string;
  selections: BetSelection[];
  combinedOdds: number;
  potentialReturn: string;
  status: string;
  createdAt: number;
  settledAt?: number;
}

export interface SlipQuote {
  type: string;
  combinedOdds: number;
  stake: string;
  potentialReturn: string;
  legCount: number;
}

export interface BetStatistics {
  total: number;
  pending: number;
  won: number;
  lost: number;
  void: number;
  totalStaked: number;
  totalReturned: number;
  net: number;
}

interface PlaceInput {
  type: string;
  stake: string;
  selections: Array<{ matchId: string; marketId: string; selectionId: string }>;
}

export const sportsApi = {
  sports: () => unwrap<SportDefinition[]>(apiClient.get('/sports/sports')),
  marketTemplates: () => unwrap<MarketTemplate[]>(apiClient.get('/sports/market-templates')),
  competitions: (sportKey?: string) =>
    unwrap<Competition[]>(apiClient.get(`/sports/competitions${sportKey ? `?sportKey=${sportKey}` : ''}`)),
  matches: (params: { sportKey?: string; competitionKey?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    const qs = q.toString();
    return unwrap<Match[]>(apiClient.get(`/sports/matches${qs ? `?${qs}` : ''}`));
  },
  live: () => unwrap<Match[]>(apiClient.get('/sports/matches/live')),
  upcoming: () => unwrap<Match[]>(apiClient.get('/sports/matches/upcoming')),
  match: (id: string) => unwrap<Match>(apiClient.get(`/sports/matches/${id}`)),

  quote: (input: PlaceInput) => unwrap<SlipQuote>(apiClient.post('/sports/quote', input)),
  place: (input: PlaceInput) => unwrap<BetSlip>(apiClient.post('/sports/bets', input)),
  bets: (status?: string) =>
    unwrap<BetSlip[]>(apiClient.get(`/sports/bets${status ? `?status=${status}` : ''}`)),
  statistics: () => unwrap<BetStatistics>(apiClient.get('/sports/bets/statistics')),
};

// ---- Admin -----------------------------------------------------------------

export interface SportsCatalogStats {
  sports: number;
  competitions: number;
  matches: number;
  live: number;
  upcoming: number;
  settled: number;
  marketTemplates: number;
}

export const adminSportsApi = {
  statistics: () => unwrap<SportsCatalogStats>(apiClient.get('/admin/sports/statistics')),
  sports: () => unwrap<SportDefinition[]>(apiClient.get('/admin/sports/sports')),
  upsertSport: (data: SportDefinition) =>
    unwrap<SportDefinition>(apiClient.post('/admin/sports/sports', data)),
  upsertCompetition: (data: Competition) =>
    unwrap<Competition>(apiClient.post('/admin/sports/competitions', data)),
  upsertMatch: (data: Omit<Match, never>) => unwrap<Match>(apiClient.post('/admin/sports/matches', data)),
  setMatchStatus: (id: string, status: string) =>
    unwrap<Match>(apiClient.put(`/admin/sports/matches/${id}/status`, { status })),
  updateOdds: (id: string, marketId: string, selectionId: string, odds: number) =>
    unwrap<Match>(apiClient.put(`/admin/sports/matches/${id}/odds`, { marketId, selectionId, odds })),
  setMarketStatus: (id: string, marketId: string, status: string) =>
    unwrap<Match>(apiClient.put(`/admin/sports/matches/${id}/markets/${marketId}/status`, { status })),
  settleMatch: (id: string, result: { winners: Record<string, string[]>; lines?: Record<string, number>; voids?: string[] }) =>
    unwrap<Match>(apiClient.post(`/admin/sports/matches/${id}/settle`, result)),
  removeMatch: (id: string) => unwrap<unknown>(apiClient.delete(`/admin/sports/matches/${id}`)),
};
