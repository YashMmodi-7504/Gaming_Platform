import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { MetricsService } from './services/metrics.service';
import { TracingService } from './services/tracing.service';
import { LogBufferService } from './services/log-buffer.service';

interface HttpRequest {
  method?: string;
  route?: { path?: string };
  url?: string;
  headers?: Record<string, string | undefined>;
  traceContext?: unknown;
}
interface HttpResponse {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
}

/**
 * Global metrics + tracing interceptor. Times every HTTP request, records
 * latency/throughput/error metrics, attaches a trace id, and feeds the log
 * explorer — the foundation of API monitoring. Non-HTTP contexts pass through.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
    private readonly logs: LogBufferService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequest>();
    const res = http.getResponse<HttpResponse>();
    const start = Date.now();
    const method = req.method ?? 'GET';
    const route = req.route?.path ?? this.normalize(req.url ?? 'unknown');

    const trace = this.tracing.start(req.headers?.['x-trace-id']);
    res.setHeader?.('x-trace-id', trace.traceId);

    const finish = (status: number, level: 'info' | 'error'): void => {
      const durationMs = Date.now() - start;
      this.metrics.recordHttp(method, route, status, durationMs);
      this.logs.push({
        ts: Date.now(),
        level,
        message: `${method} ${route} ${status}`,
        method,
        route,
        status,
        durationMs,
        traceId: trace.traceId,
      });
    };

    return next.handle().pipe(
      tap(() => finish(res.statusCode ?? 200, 'info')),
      catchError((error: { status?: number }) => {
        finish(error?.status ?? 500, 'error');
        return throwError(() => error);
      }),
    );
  }

  /** Collapse high-cardinality ids in raw URLs into a stable route label. */
  private normalize(url: string): string {
    return url
      .split('?')[0]!
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
      .replace(/\/\d+/g, '/:n');
  }
}
