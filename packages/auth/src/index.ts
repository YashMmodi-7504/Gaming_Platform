/**
 * @gaming-platform/auth
 *
 * Server-side authentication primitives: password hashing, JWT signing and
 * verification, and role-based access helpers. Framework-agnostic — consumed
 * by the NestJS backend.
 */

export * from './constants';
export * from './password';
export * from './tokens';
export * from './rbac';
