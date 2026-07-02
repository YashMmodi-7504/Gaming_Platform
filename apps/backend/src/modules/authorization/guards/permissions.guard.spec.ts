import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '@gaming-platform/types';

import { PermissionsGuard } from './permissions.guard';
import { ROLE_SLUGS } from '../rbac.constants';

function contextFor(user: Partial<AuthenticatedUser> | undefined): ExecutionContext {
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const mockRequirement = (value: unknown) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(value);

  afterEach(() => jest.restoreAllMocks());

  it('allows when no permissions are required', () => {
    mockRequirement(undefined);
    expect(guard.canActivate(contextFor({ permissions: [] }))).toBe(true);
  });

  it('allows when the user holds all required permissions (mode: all)', () => {
    mockRequirement({ permissions: ['users:read', 'users:write'], mode: 'all' });
    const user = { roles: [], permissions: ['users:read', 'users:write'] };
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('denies when a required permission is missing', () => {
    mockRequirement({ permissions: ['users:read', 'users:write'], mode: 'all' });
    const user = { roles: [], permissions: ['users:read'] };
    expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });

  it('allows with any-mode when at least one matches', () => {
    mockRequirement({ permissions: ['users:read', 'roles:write'], mode: 'any' });
    const user = { roles: [], permissions: ['roles:write'] };
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('super admins bypass all checks', () => {
    mockRequirement({ permissions: ['anything:write'], mode: 'all' });
    const user = { roles: [ROLE_SLUGS.SUPER_ADMIN], permissions: [] };
    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('denies unauthenticated requests', () => {
    mockRequirement({ permissions: ['users:read'], mode: 'all' });
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
