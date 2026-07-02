import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RetryPolicy, type RetryConfig } from '@gaming-platform/ops-core';

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'dead';

export interface Job<T = unknown> {
  id: string;
  queue: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  enqueuedAt: number;
  lastError?: string;
  nextRunAt: number;
}

type Processor<T = unknown> = (payload: T) => Promise<void>;

const DEFAULT_RETRY: RetryConfig = { maxAttempts: 3, baseDelayMs: 500, factor: 2, maxDelayMs: 30000 };

/**
 * A lightweight, dependency-free background job queue with retries, exponential
 * backoff and a dead-letter queue. Workers are registered per queue; a single
 * poll loop drains due jobs. Suitable for settlement retries, notifications and
 * batch processing without pulling in an external broker.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly jobs = new Map<string, Job>();
  private readonly processors = new Map<string, Processor>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private draining = false;

  constructor() {
    this.timer = setInterval(() => void this.drain(), 250);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Register the worker for a queue. */
  process<T>(queue: string, processor: Processor<T>): void {
    this.processors.set(queue, processor as Processor);
  }

  /** Enqueue a job. Returns its id. */
  enqueue<T>(queue: string, payload: T, opts: { maxAttempts?: number } = {}): string {
    const id = randomUUID();
    this.jobs.set(id, {
      id,
      queue,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
      enqueuedAt: Date.now(),
      nextRunAt: 0, // runnable immediately
    });
    return id;
  }

  /** Enqueue many jobs (batch). */
  enqueueBatch<T>(queue: string, payloads: T[], opts: { maxAttempts?: number } = {}): string[] {
    return payloads.map((p) => this.enqueue(queue, p, opts));
  }

  stats() {
    const byStatus: Record<JobStatus, number> = { pending: 0, active: 0, completed: 0, failed: 0, dead: 0 };
    let backlog = 0;
    for (const job of this.jobs.values()) {
      byStatus[job.status] += 1;
      if (job.status === 'pending') backlog += 1;
    }
    return {
      queues: [...this.processors.keys()],
      backlog,
      byStatus,
      deadLetter: [...this.jobs.values()].filter((j) => j.status === 'dead').length,
    };
  }

  deadLetters(): Job[] {
    return [...this.jobs.values()].filter((j) => j.status === 'dead');
  }

  /** Requeue a dead-letter job for another attempt. */
  retry(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'dead') return false;
    job.status = 'pending';
    job.attempts = 0;
    job.nextRunAt = 0;
    return true;
  }

  /** Drain due jobs once. Exposed for deterministic testing. */
  async drain(now = Date.now()): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      for (const job of this.jobs.values()) {
        if (job.status !== 'pending' || job.nextRunAt > now) continue;
        const processor = this.processors.get(job.queue);
        if (!processor) continue;
        job.status = 'active';
        job.attempts += 1;
        try {
          await processor(job.payload);
          job.status = 'completed';
        } catch (error) {
          job.lastError = (error as Error).message;
          if (RetryPolicy.shouldRetry(job.attempts, { ...DEFAULT_RETRY, maxAttempts: job.maxAttempts })) {
            job.status = 'pending';
            job.nextRunAt = now + RetryPolicy.delay(job.attempts, DEFAULT_RETRY);
          } else {
            job.status = 'dead'; // dead-letter
          }
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
