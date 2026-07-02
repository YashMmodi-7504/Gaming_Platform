import type {
  GameCategoryNode,
  GameCollectionSummary,
  GameDetail,
  GameLaunchResolution,
  GameProviderSummary,
  GameReviewSummary,
  GameSortOption,
  GameSummary,
  PaginatedResult,
} from '@gaming-platform/types';

import { apiClient, unwrap } from './api-client';

export interface GameListParams {
  page?: number;
  limit?: number;
  sort?: GameSortOption;
  search?: string;
  category?: string;
  provider?: string;
  tag?: string;
  device?: string;
  ageRating?: string;
  minRtp?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const gamesApi = {
  list: (params: GameListParams = {}) =>
    unwrap<PaginatedResult<GameSummary>>(
      apiClient.get(`/games${buildQuery(params as Record<string, unknown>)}`),
    ),

  featured: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/games/featured?limit=${limit}`)),
  trending: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/games/trending?limit=${limit}`)),
  popular: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/games/popular?limit=${limit}`)),
  recentlyAdded: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/games/recently-added?limit=${limit}`)),
  recommended: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/games/recommended?limit=${limit}`)),

  detail: (slug: string) => unwrap<GameDetail>(apiClient.get(`/games/${slug}`)),
  related: (slug: string) => unwrap<GameSummary[]>(apiClient.get(`/games/${slug}/related`)),
  reviews: (slug: string, page = 1) =>
    unwrap<PaginatedResult<GameReviewSummary>>(apiClient.get(`/games/${slug}/reviews?page=${page}`)),
  resolveLaunch: (slug: string, device?: string) =>
    unwrap<GameLaunchResolution>(apiClient.get(`/games/${slug}/launch${device ? `?device=${device}` : ''}`)),

  categories: () => unwrap<GameCategoryNode[]>(apiClient.get('/game-categories')),
  providers: () => unwrap<GameProviderSummary[]>(apiClient.get('/game-providers')),

  collections: (featured = false) =>
    unwrap<GameCollectionSummary[]>(apiClient.get(`/game-collections${featured ? '?featured=true' : ''}`)),
  collection: (slug: string, page = 1) =>
    unwrap<{ collection: GameCollectionSummary; games: PaginatedResult<GameSummary> }>(
      apiClient.get(`/game-collections/${slug}?page=${page}`),
    ),

  // Favorites
  favorites: (page = 1) =>
    unwrap<PaginatedResult<GameSummary>>(apiClient.get(`/favorites?page=${page}`)),
  favoriteIds: () => unwrap<string[]>(apiClient.get('/favorites/ids')),
  toggleFavorite: (gameId: string) =>
    unwrap<{ favorited: boolean }>(apiClient.post(`/favorites/${gameId}/toggle`, {})),

  // Recently played
  recentlyPlayed: (limit = 12) =>
    unwrap<GameSummary[]>(apiClient.get(`/recently-played?limit=${limit}`)),
  recordPlay: (gameId: string) =>
    unwrap<{ success: true }>(apiClient.post(`/recently-played/${gameId}`, {})),

  // Ratings & reviews
  rate: (gameId: string, rating: number) =>
    unwrap<{ average: number; count: number }>(apiClient.post(`/game-ratings/${gameId}`, { rating })),
  review: (gameId: string, data: { rating?: number; title?: string; body: string }) =>
    unwrap<unknown>(apiClient.post(`/game-ratings/${gameId}/review`, data)),
};
