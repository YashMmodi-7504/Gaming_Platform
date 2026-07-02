import { Injectable } from '@nestjs/common';

export interface LogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  traceId?: string;
}

/**
 * An in-memory ring buffer of recent structured log entries powering the Log
 * Explorer. The metrics interceptor feeds request logs here; services can push
 * notable events. Bounded so memory stays flat.
 */
@Injectable()
export class LogBufferService {
  private readonly entries: LogEntry[] = [];
  private cursor = 0;
  // Fixed ring-buffer capacity. Declared as a field (not a constructor
  // parameter) so Nest does not attempt to resolve it as an injected
  // dependency during DI.
  private readonly capacity = 1000;

  push(entry: LogEntry): void {
    if (this.entries.length < this.capacity) {
      this.entries.push(entry);
    } else {
      this.entries[this.cursor] = entry;
      this.cursor = (this.cursor + 1) % this.capacity;
    }
  }

  /** Most-recent first, optionally filtered by level and free-text. */
  recent(options: { level?: string; search?: string; limit?: number } = {}): LogEntry[] {
    const { level, search, limit = 200 } = options;
    return [...this.entries]
      .sort((a, b) => b.ts - a.ts)
      .filter((e) => (level ? e.level === level : true))
      .filter((e) => (search ? `${e.message} ${e.route ?? ''}`.toLowerCase().includes(search.toLowerCase()) : true))
      .slice(0, limit);
  }

  stats(): { total: number; errors: number; warnings: number } {
    return {
      total: this.entries.length,
      errors: this.entries.filter((e) => e.level === 'error').length,
      warnings: this.entries.filter((e) => e.level === 'warn').length,
    };
  }
}
