import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface WinstonOptions {
  level: string;
  appName: string;
  isProduction: boolean;
}

/** Keys whose values must never appear in logs (case-insensitive). */
const SENSITIVE_KEYS = new Set(
  [
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'cookie',
    'secret',
    'apikey',
    'idempotencykey',
    'twofactorsecret',
    'serverseed',
    'clientseed',
    'creditcard',
    'cvv',
  ].map((k) => k.toLowerCase()),
);

const REDACTED = '[REDACTED]';

/** Recursively redact sensitive values from an arbitrary log payload. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redactValue(val, depth + 1);
  }
  return out;
}

/**
 * Winston format that strips secrets (passwords, tokens, seeds, keys…) from log
 * metadata before any transport writes them — defense against accidental
 * sensitive-data exposure in logs (OWASP A09).
 */
const redactFormat = winston.format((info) => redactValue(info) as winston.Logform.TransformableInfo)();

/**
 * Builds the Winston logger options used as the application-wide logger.
 * Pretty, colorized console output in development; structured JSON plus
 * rotating files in production.
 */
export const createWinstonOptions = ({
  level,
  appName,
  isProduction,
}: WinstonOptions): winston.LoggerOptions => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(redactFormat, winston.format.timestamp(), winston.format.json())
        : winston.format.combine(
            redactFormat,
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.ms(),
            nestWinstonUtilities.format.nestLike(appName, {
              colors: true,
              prettyPrint: true,
            }),
          ),
    }),
  ];

  if (isProduction) {
    transports.push(
      new DailyRotateFile({
        dirname: 'logs',
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(redactFormat, winston.format.timestamp(), winston.format.json()),
      }),
      new DailyRotateFile({
        level: 'error',
        dirname: 'logs',
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(redactFormat, winston.format.timestamp(), winston.format.json()),
      }),
    );
  }

  return {
    level,
    defaultMeta: { service: appName },
    transports,
    exitOnError: false,
  };
};
