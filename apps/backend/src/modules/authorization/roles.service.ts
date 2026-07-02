import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { slugify } from '@gaming-platform/shared';

import { PrismaService } from '../database/prisma.service';
import { RbacService } from './rbac.service';

/**
 * Administrative management of roles, permissions, and user-role assignments.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  listRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { level: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  async createRole(input: { name: string; level?: number; permissionIds?: string[] }) {
    const slug = slugify(input.name);
    const existing = await this.prisma.role.findFirst({ where: { OR: [{ slug }, { name: input.name }] } });
    if (existing) {
      throw new ConflictException('A role with that name already exists');
    }

    return this.prisma.role.create({
      data: {
        name: input.name,
        slug,
        level: input.level ?? 10,
        isSystem: false,
        permissions: input.permissionIds?.length
          ? { create: input.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async setRolePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.role.findUniqueOrThrow({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async assignRoleToUser(userId: string, roleId: string, assignedById?: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { assignedById },
      create: { userId, roleId, assignedById },
    });
    await this.rbac.invalidate(userId);
    return { success: true as const };
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    await this.rbac.invalidate(userId);
    return { success: true as const };
  }
}
