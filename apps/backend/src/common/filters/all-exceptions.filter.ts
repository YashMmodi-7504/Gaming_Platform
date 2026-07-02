import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { ApiErrorResponse, ApiFieldError } from '@gaming-platform/types';
import { AppError } from '@gaming-platform/shared';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';
import type { Logger } from 'winston';

interface NestValidationShape {
  message?: string | string[];
  error?: string;
}

/**
 * Catches every unhandled error and renders it as the platform's standard
 * {@link ApiErrorResponse}. Validation errors, HTTP exceptions, domain
 * {@link AppError}s, and unknown failures are all normalized here.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const { statusCode, message, error, errors } = this.normalize(exception);

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: request.id,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.originalUrl} → ${statusCode}: ${message}`, {
        context: 'ExceptionFilter',
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.warn(`${request.method} ${request.originalUrl} → ${statusCode}: ${message}`, {
        context: 'ExceptionFilter',
      });
    }

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    errors?: ApiFieldError[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { statusCode: status, message: payload, error: exception.name };
      }

      const shape = payload as NestValidationShape;
      const rawMessage = shape.message ?? exception.message;
      const messages = Array.isArray(rawMessage) ? rawMessage : [rawMessage];

      return {
        statusCode: status,
        message: messages[0] ?? exception.message,
        error: shape.error ?? exception.name,
        errors: Array.isArray(rawMessage)
          ? rawMessage.map((m) => ({ field: '', message: m }))
          : undefined,
      };
    }

    if (exception instanceof AppError) {
      return { statusCode: exception.statusCode, message: exception.message, error: exception.code };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
