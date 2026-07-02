import type { ApiErrorResponse, ApiResponse } from '@gaming-platform/types';
import axios, { type AxiosError, type AxiosInstance } from 'axios';

import { clientConfig } from './config';

/**
 * Shared Axios instance pointed at the versioned API. Sends credentials so the
 * refresh-token cookie flows automatically.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: clientConfig.apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

let accessToken: string | null = null;

/** Set or clear the in-memory bearer token used for authenticated requests. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => Promise.reject(normalizeError(error)),
);

export interface NormalizedApiError {
  statusCode: number;
  message: string;
  error: string;
}

function normalizeError(error: AxiosError<ApiErrorResponse>): NormalizedApiError {
  if (error.response?.data) {
    const { statusCode, message, error: code } = error.response.data;
    return { statusCode, message, error: code };
  }
  return {
    statusCode: error.response?.status ?? 0,
    message: error.message || 'Network error',
    error: error.code ?? 'NETWORK_ERROR',
  };
}

/** Unwrap the standard API envelope, returning just the `data` payload. */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
