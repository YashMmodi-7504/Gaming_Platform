/**
 * Resilience primitives: circuit breaker, retry policy and a token-bucket rate
 * limiter. All are deterministic — the current time is injected — so they are
 * fully unit-testable (including chaos / recovery scenarios).
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Consecutive failures that trip the breaker. */
  failureThreshold: number;
  /** Consecutive successes in half-open that close it. */
  successThreshold: number;
  /** Cooldown before a tripped breaker allows a trial request (ms). */
  openMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private openedAt = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  get current(): CircuitState {
    return this.state;
  }

  /** May a request proceed at `now`? Transitions open → half-open after cooldown. */
  canRequest(now: number): boolean {
    if (this.state === 'open') {
      if (now - this.openedAt >= this.config.openMs) {
        this.state = 'half-open';
        this.successes = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(now: number): void {
    if (this.state === 'half-open') {
      this.trip(now);
      return;
    }
    this.failures += 1;
    if (this.failures >= this.config.failureThreshold) this.trip(now);
  }

  private trip(now: number): void {
    this.state = 'open';
    this.openedAt = now;
    this.successes = 0;
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
}

export const RetryPolicy = {
  /** Backoff delay (ms) before attempt `n` (1-based). Capped at maxDelayMs. */
  delay(attempt: number, config: RetryConfig): number {
    const raw = config.baseDelayMs * Math.pow(config.factor, Math.max(0, attempt - 1));
    return Math.min(config.maxDelayMs, Math.round(raw));
  },

  shouldRetry(attempt: number, config: RetryConfig): boolean {
    return attempt < config.maxAttempts;
  },

  /** The full schedule of delays for a policy (useful for tests / docs). */
  schedule(config: RetryConfig): number[] {
    return Array.from({ length: config.maxAttempts - 1 }, (_, i) => RetryPolicy.delay(i + 1, config));
  },
};

/** A token-bucket rate limiter. Tokens refill continuously; time is injected. */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    now = 0,
  ) {
    this.tokens = capacity;
    this.lastRefill = now;
  }

  private refill(now: number): void {
    const elapsed = Math.max(0, now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }

  /** Attempt to consume `count` tokens at `now`; returns whether allowed. */
  tryRemove(now: number, count = 1): boolean {
    this.refill(now);
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  available(now: number): number {
    this.refill(now);
    return Math.floor(this.tokens);
  }
}
