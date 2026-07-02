import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { ApiResponse } from '@gaming-platform/types';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

/**
 * Wraps every successful handler result in the standard {@link ApiResponse}
 * envelope. Handlers return raw data; the envelope is applied uniformly here.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message: 'OK',
        data: data as T,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        requestId: request.id,
      })),
    );
  }
}
