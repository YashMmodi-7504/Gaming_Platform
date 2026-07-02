/**
 * Async control-flow helpers.
 */

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  factor?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Retry an async operation with exponential backoff.
 */
export const retry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const { retries = 3, delayMs = 200, factor = 2, onRetry } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      onRetry?.(error, attempt + 1);
      await sleep(delayMs * Math.pow(factor, attempt));
      attempt += 1;
    }
  }

  throw lastError;
};

export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out',
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
};
