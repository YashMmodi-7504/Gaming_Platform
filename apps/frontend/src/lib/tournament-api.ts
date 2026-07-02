import { apiClient, unwrap } from './api-client';

export interface TournamentSummary {
  id: string;
  name: string;
  format: string;
  status: string;
  cadence: string;
  capacity: number;
  registered: number;
  entryFee: string;
  prizePool: string;
  startsAt: string | null;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  bracket: string;
  state: string;
  slots: Array<{ participantId: string | null; score?: number }>;
  winnerId: string | null;
}

export interface TournamentDetail extends TournamentSummary {
  description: string;
  registrationMode: string;
  prize: { type: string; tiers: Array<{ fromRank: number; toRank: number; value: number }> };
  bracket: { format: string; rounds: number; matches: BracketMatch[] } | null;
  participants: Array<{ id: string; displayName: string; seed?: number; status: string; score: number }>;
  standings: Array<{ participantId: string; displayName: string; rank: number; score: number }>;
  awards: Array<{ rank: number; participantId: string; amount: string }>;
}

export interface LeaderboardSummary {
  id: string;
  name: string;
  metric: string;
  period: string;
}

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
}

export interface MissionView {
  xp: number;
  level: number;
  levelProgress: { into: number; needed: number };
  missions: Array<{
    id: string;
    name: string;
    window: string;
    metric: string;
    target: number;
    xp: number;
    value: number;
    completed: boolean;
    percent: number;
  }>;
}

export interface AchievementView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  points: number;
  progress: number;
  target: number;
  unlocked: boolean;
}

export interface RewardClaim {
  id: string;
  status: string;
  reward: { name: string; type: string; value: string | null };
}

export interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export const tournamentApi = {
  list: (status?: string) =>
    unwrap<TournamentSummary[]>(apiClient.get(`/tournaments${status ? `?status=${status}` : ''}`)),
  detail: (id: string) => unwrap<TournamentDetail>(apiClient.get(`/tournaments/${id}`)),
  register: (id: string, password?: string) =>
    unwrap<unknown>(apiClient.post(`/tournaments/${id}/register`, { password })),
  checkIn: (id: string) => unwrap<unknown>(apiClient.post(`/tournaments/${id}/checkin`, {})),
  withdraw: (id: string) => unwrap<unknown>(apiClient.post(`/tournaments/${id}/withdraw`, {})),

  leaderboards: () => unwrap<LeaderboardSummary[]>(apiClient.get('/tournaments/leaderboards/list')),
  leaderboardTop: (id: string) =>
    unwrap<LeaderboardEntry[]>(apiClient.get(`/tournaments/leaderboards/${id}/top`)),

  myMissions: () => unwrap<MissionView>(apiClient.get('/tournaments/me/missions')),
  myAchievements: () => unwrap<AchievementView[]>(apiClient.get('/tournaments/me/achievements')),
  myRewards: () => unwrap<RewardClaim[]>(apiClient.get('/tournaments/me/rewards')),
  claimReward: (claimId: string, currencyId?: string) =>
    unwrap<unknown>(apiClient.post(`/tournaments/me/rewards/${claimId}/claim`, { currencyId })),

  seasons: () => unwrap<Season[]>(apiClient.get('/tournaments/seasons/list')),
  currentSeason: () => unwrap<Season | null>(apiClient.get('/tournaments/seasons/current')),
};

// ---- Admin -----------------------------------------------------------------

export interface TournamentStats {
  total: number;
  live: number;
  registration: number;
  completed: number;
  totalParticipants: number;
}

export const adminTournamentApi = {
  statistics: () => unwrap<TournamentStats>(apiClient.get('/admin/tournaments/statistics')),
  create: (data: Record<string, unknown>) =>
    unwrap<TournamentSummary>(apiClient.post('/admin/tournaments', data)),
  open: (id: string) => unwrap<unknown>(apiClient.post(`/admin/tournaments/${id}/open`, {})),
  start: (id: string) => unwrap<unknown>(apiClient.post(`/admin/tournaments/${id}/start`, {})),
  report: (id: string, matchId: string, winnerParticipantId: string) =>
    unwrap<unknown>(apiClient.post(`/admin/tournaments/${id}/report`, { matchId, winnerParticipantId })),
  complete: (id: string) => unwrap<unknown>(apiClient.post(`/admin/tournaments/${id}/complete`, {})),
  cancel: (id: string) => unwrap<unknown>(apiClient.post(`/admin/tournaments/${id}/cancel`, {})),
  createLeaderboard: (data: Record<string, unknown>) =>
    unwrap<unknown>(apiClient.post('/admin/tournaments/leaderboards', data)),
  upsertMission: (data: Record<string, unknown>) =>
    unwrap<unknown>(apiClient.post('/admin/tournaments/missions', data)),
  createAchievement: (data: Record<string, unknown>) =>
    unwrap<unknown>(apiClient.post('/admin/tournaments/achievements', data)),
  createReward: (data: Record<string, unknown>) =>
    unwrap<unknown>(apiClient.post('/admin/tournaments/rewards', data)),
  upsertSeason: (data: Record<string, unknown>) =>
    unwrap<unknown>(apiClient.post('/admin/tournaments/seasons', data)),
};
