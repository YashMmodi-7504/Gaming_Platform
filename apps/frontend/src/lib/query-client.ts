import { QueryClient } from '@tanstack/react-query';

/**
 * Factory for the React Query client. A new instance is created per request on
 * the server and once on the client to avoid cross-request state leakage.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
