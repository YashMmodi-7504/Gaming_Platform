import type { GameSummary, PaginatedResult } from '@gaming-platform/types';

import { apiClient, unwrap } from './api-client';

export interface CatalogStatistics {
  totalGames: number;
  byStatus: Record<string, number>;
  providers: number;
  categories: number;
  collections: number;
  featured: number;
  inMaintenance: number;
}

export const adminGamesApi = {
  list: (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const qs = q.toString();
    return unwrap<PaginatedResult<GameSummary>>(apiClient.get(`/admin/games${qs ? `?${qs}` : ''}`));
  },

  statistics: () => unwrap<CatalogStatistics>(apiClient.get('/admin/games/statistics')),

  setStatus: (id: string, status: string) =>
    unwrap<unknown>(apiClient.patch(`/admin/games/${id}/status`, { status })),

  setFlags: (id: string, flags: { isFeatured?: boolean; isNew?: boolean }) =>
    unwrap<unknown>(apiClient.patch(`/admin/games/${id}/flags`, flags)),

  setMaintenance: (id: string, enabled: boolean, message?: string) =>
    unwrap<unknown>(apiClient.patch(`/admin/games/${id}/maintenance`, { enabled, message })),

  remove: (id: string) => unwrap<unknown>(apiClient.delete(`/admin/games/${id}`)),
};
