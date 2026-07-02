import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { TraceIdFactory, type TraceContext } from '@gaming-platform/ops-core';

/**
 * Distributed tracing context. Issues trace/span ids and propagates an incoming
 * `traceparent` so requests can be correlated across logs, metrics and services.
 */
@Injectable()
export class TracingService {
  private readonly factory = new TraceIdFactory(randomBytes(4).toString('hex'));

  /** Start a root trace, or continue an incoming one. */
  start(incomingTraceId?: string): TraceContext {
    if (incomingTraceId) {
      return this.factory.next({ traceId: incomingTraceId, spanId: incomingTraceId.slice(0, 16) });
    }
    return this.factory.next();
  }

  child(parent: TraceContext): TraceContext {
    return this.factory.next(parent);
  }

  /** W3C-style traceparent header value. */
  header(ctx: TraceContext): string {
    return `00-${ctx.traceId}-${ctx.spanId}-01`;
  }
}
