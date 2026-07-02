import type { PaginatedResult, PaginationMeta } from '@gaming-platform/types';

import { PAGINATION } from '../constants';

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Clamp and normalize raw pagination input into safe DB query parameters.
 */
export const normalizePagination = (page?: number, limit?: number): NormalizedPagination => {
  const safePage = Math.max(PAGINATION.DEFAULT_PAGE, Math.floor(page ?? PAGINATION.DEFAULT_PAGE));
  const safeLimit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(PAGINATION.MIN_LIMIT, Math.floor(limit ?? PAGINATION.DEFAULT_LIMIT)),
  );
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

export const buildPaginatedResult = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> => ({
  items,
  meta: buildPaginationMeta(total, page, limit),
});
