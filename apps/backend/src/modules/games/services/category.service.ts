import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GameCategoryNode } from '@gaming-platform/types';

import { PrismaService } from '../../database/prisma.service';
import { GameRepository } from '../repository/game.repository';
import { GameCacheService } from './game-cache.service';
import { assertValidSlug, uniqueSlug } from './slug.util';

const TREE_TTL = 300;

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: GameRepository,
    private readonly cache: GameCacheService,
  ) {}

  /** The full nested category tree with per-category public game counts. */
  async tree(): Promise<GameCategoryNode[]> {
    return this.cache.wrap(['category-tree'], TREE_TTL, async () => {
      const [categories, counts] = await Promise.all([
        this.prisma.gameCategory.findMany({
          where: { deletedAt: null, isActive: true },
          orderBy: { displayOrder: 'asc' },
        }),
        this.prisma.game.groupBy({
          by: ['categoryId'],
          where: this.repository.buildWhere({}),
          _count: { _all: true },
        }),
      ]);

      const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count._all]));
      const nodes = new Map<string, GameCategoryNode>();
      for (const c of categories) {
        nodes.set(c.id, {
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          iconUrl: c.iconUrl,
          displayOrder: c.displayOrder,
          gameCount: countByCategory.get(c.id) ?? 0,
          children: [],
        });
      }

      const roots: GameCategoryNode[] = [];
      for (const c of categories) {
        const node = nodes.get(c.id)!;
        const parent = c.parentId ? nodes.get(c.parentId) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      return roots;
    });
  }

  listFlat() {
    return this.prisma.gameCategory.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const category = await this.prisma.gameCategory.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /** All descendant category ids (inclusive) — used to roll games up a tree. */
  async descendantIds(categoryId: string): Promise<string[]> {
    const all = await this.prisma.gameCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, parentId: true },
    });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (c.parentId) {
        const list = childrenOf.get(c.parentId) ?? [];
        list.push(c.id);
        childrenOf.set(c.parentId, list);
      }
    }
    const result: string[] = [];
    const stack = [categoryId];
    while (stack.length) {
      const id = stack.pop()!;
      result.push(id);
      stack.push(...(childrenOf.get(id) ?? []));
    }
    return result;
  }

  // ---- Admin ---------------------------------------------------------------

  async create(input: {
    name: string;
    parentId?: string;
    description?: string;
    iconUrl?: string;
    displayOrder?: number;
  }) {
    const slug = await uniqueSlug(input.name, (s) =>
      this.prisma.gameCategory.findFirst({ where: { slug: s } }).then(Boolean),
    );
    if (input.parentId) {
      const parent = await this.prisma.gameCategory.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    const category = await this.prisma.gameCategory.create({
      data: {
        slug,
        name: input.name,
        parentId: input.parentId,
        description: input.description,
        iconUrl: input.iconUrl,
        displayOrder: input.displayOrder ?? 0,
      },
    });
    await this.cache.invalidate();
    return category;
  }

  async update(
    id: string,
    input: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      description?: string;
      iconUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    await this.ensureExists(id);
    if (input.slug) assertValidSlug(input.slug);
    if (input.parentId === id) {
      throw new ConflictException('A category cannot be its own parent');
    }
    const category = await this.prisma.gameCategory.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId,
        description: input.description,
        iconUrl: input.iconUrl,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
      },
    });
    await this.cache.invalidate();
    return category;
  }

  async reorder(items: Array<{ id: string; displayOrder: number }>) {
    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.gameCategory.update({
          where: { id: i.id },
          data: { displayOrder: i.displayOrder },
        }),
      ),
    );
    await this.cache.invalidate();
    return { success: true as const };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.gameCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.cache.invalidate();
    return { success: true as const };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.gameCategory.findFirst({ where: { id, deletedAt: null } });
    if (!found) throw new NotFoundException('Category not found');
  }
}
