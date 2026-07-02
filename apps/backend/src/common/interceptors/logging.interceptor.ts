import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import type { Logger } from 'winston';

/**
 * Logs each HTTP request with method, path, status code, and duration.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.info(`${method} ${originalUrl} ${response.statusCode} +${duration}ms`, {
            context: 'HTTP',
            method,
            url: originalUrl,
            statusCode: response.statusCode,
            durationMs: duration,
          });
        },
        error: (error: unknown) => {
          const duration = Date.now() - startedAt;
          this.logger.warn(`${method} ${originalUrl} failed +${duration}ms`, {
            context: 'HTTP',
            method,
            url: originalUrl,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }
}
