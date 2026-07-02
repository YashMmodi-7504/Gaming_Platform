import { Prisma, PrismaClient } from '@prisma/client';

/**
 * @gaming-platform/database
 *
 * Centralized Prisma client. The backend wraps this in a NestJS provider, but
 * the raw client and a process-wide singleton are exported here so scripts and
 * tooling can share a single connection.
 */

export type PrismaClientOptions = Prisma.PrismaClientOptions;

const buildLogLevels = (): Prisma.LogLevel[] =>
  process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'];

/**
 * Factory that constructs a configured PrismaClient instance.
 */
export const createPrismaClient = (options?: PrismaClientOptions): PrismaClient =>
  new PrismaClient({
    log: buildLogLevels(),
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    ...options,
  });

/**
 * Process-wide singleton. In development we attach it to `globalThis` to
 * survive hot-reloads and avoid exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export { Prisma, PrismaClient };
export default prisma;
