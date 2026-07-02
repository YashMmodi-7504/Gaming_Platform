/**
 * Framework-agnostic error primitives. The backend maps these onto HTTP
 * exceptions; the frontend can narrow on `code` for UX handling.
 */

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_FUNDS'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  code: AppErrorCode;
  statusCode: number;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
    };
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
