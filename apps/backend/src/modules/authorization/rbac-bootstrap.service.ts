import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { PrismaService } from '../database/prisma.service';
import { ALL_PERMISSIONS, ROLE_DEFINITIONS } from './rbac.constants';

/**
 * Idempotently provisions the system RBAC catalog (permissions, roles, and
 * role→permission grants) on startup. This is platform configuration data, not
 * demo data — it is safe to run on every boot.
 */
@Injectable()
export class RbacBootstrapService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncPermissions();
    await this.syncRoles();
    this.logger.info('RBAC catalog synchronized', { context: 'RbacBootstrap' });
  }

  private async syncPermissions(): Promise<void> {
    for (const slug of ALL_PERMISSIONS) {
      const [resource, action] = slug.split(':');
      await this.prisma.permission.upsert({
        where: { slug },
        update: { resource: resource ?? slug, action: action ?? 'manage' },
        create: {
          slug,
          name: slug,
          resource: resource ?? slug,
          action: action ?? 'manage',
        },
      });
    }
  }

  private async syncRoles(): Promise<void> {
    const permissions = await this.prisma.permission.findMany({ select: { id: true, slug: true } });
    const permissionIdBySlug = new Map(permissions.map((p) => [p.slug, p.id]));

    for (const def of ROLE_DEFINITIONS) {
      const role = await this.prisma.role.upsert({
        where: { slug: def.slug },
        update: { name: def.name, level: def.level, isSystem: true },
        create: { slug: def.slug, name: def.name, level: def.level, isSystem: true },
      });

      const existing = await this.prisma.rolePermission.findMany({
        where: { roleId: role.id },
        select: { permissionId: true },
      });
      const existingIds = new Set(existing.map((e) => e.permissionId));

      const desiredIds = def.permissions
        .map((slug) => permissionIdBySlug.get(slug))
        .filter((id): id is string => Boolean(id));

      const toCreate = desiredIds.filter((id) => !existingIds.has(id));
      if (toCreate.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: toCreate.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }
    }
  }
}
