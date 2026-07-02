import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreaker, type CircuitBreakerConfig, type CircuitState } from '@gaming-platform/ops-core';

const DEFAULT: CircuitBreakerConfig = { failureThreshold: 5, successThreshold: 2, openMs: 10000 };

/**
 * A registry of named circuit breakers protecting calls to fragile dependencies
 * (gateways, third-party APIs). `execute` short-circuits when a breaker is open,
 * preventing cascading failures, and records success/failure to drive recovery.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, CircuitBreaker>();

  private breaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let cb = this.breakers.get(name);
    if (!cb) {
      cb = new CircuitBreaker({ ...DEFAULT, ...config });
      this.breakers.set(name, cb);
    }
    return cb;
  }

  /** Run `fn` through the named breaker; throws 503 if the breaker is open. */
  async execute<T>(name: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const cb = this.breaker(name, config);
    const now = Date.now();
    if (!cb.canRequest(now)) {
      throw new ServiceUnavailableException(`Circuit "${name}" is open`);
    }
    try {
      const result = await fn();
      cb.recordSuccess();
      return result;
    } catch (error) {
      cb.recordFailure(Date.now());
      throw error;
    }
  }

  states(): Record<string, CircuitState> {
    return Object.fromEntries([...this.breakers.entries()].map(([name, cb]) => [name, cb.current]));
  }
}
