import type { ISODateString } from './common';

/**
 * Standard API envelope returned by the backend for every request.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: ISODateString;
  path?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  errors?: ApiFieldError[];
  timestamp: ISODateString;
  path?: string;
  requestId?: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  info: Record<string, { status: 'up' | 'down'; [key: string]: unknown }>;
  error: Record<string, { status: 'up' | 'down'; [key: string]: unknown }>;
  details: Record<string, { status: 'up' | 'down'; [key: string]: unknown }>;
  uptime: number;
  version: string;
  timestamp: ISODateString;
}
