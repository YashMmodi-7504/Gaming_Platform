import type { Prisma } from '@gaming-platform/database';

import type { PrismaService } from '../../database/prisma.service';
import { GameRepository } from './game.repository';

function clauses(where: Prisma.GameWhereInput): Prisma.GameWhereInput[] {
  return (where.AND as Prisma.GameWhereInput[]) ?? [];
}

describe('GameRepository', () => {
  const repo = new GameRepository({} as unknown as PrismaService);

  describe('buildWhere', () => {
    it('applies public visibility & availability by default', () => {
      const list = clauses(repo.buildWhere({}));
      const json = JSON.stringify(list);
      expect(json).toContain('"status":"ACTIVE"');
      expect(json).toContain('"visibility":"PUBLIC"');
      expect(json).toContain('publishedAt');
    });

    it('bypasses public constraints for admin listings', () => {
      const list = clauses(repo.buildWhere({ includeUnavailable: true }));
      expect(list).toEqual([{ deletedAt: null }]);
    });

    it('filters by category slug and provider code', () => {
      const json = JSON.stringify(clauses(repo.buildWhere({ categorySlug: 'slots', providerCode: 'acme' })));
      expect(json).toContain('"category":{"slug":"slots"}');
      expect(json).toContain('"provider":{"code":"acme"}');
    });

    it('applies geo allow/block rules', () => {
      const json = JSON.stringify(clauses(repo.buildWhere({ countryCode: 'us' })));
      expect(json).toContain('"geoBlock":{"has":"US"}');
      expect(json).toContain('"geoAllow":{"isEmpty":true}');
      expect(json).toContain('"geoAllow":{"has":"US"}');
    });

    it('builds a search OR across name, slug, description, tags, provider', () => {
      const json = JSON.stringify(clauses(repo.buildWhere({ search: 'fortune' })));
      expect(json).toContain('"name":{"contains":"fortune"');
      expect(json).toContain('"slug":{"contains":"fortune"');
      expect(json).toContain('tag');
    });
  });

  describe('buildOrderBy', () => {
    it('maps sort options to order clauses', () => {
      expect(repo.buildOrderBy('newest')).toEqual([
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ]);
      expect(repo.buildOrderBy('rating')).toEqual([
        { ratingAverage: 'desc' },
        { ratingCount: 'desc' },
      ]);
      expect(repo.buildOrderBy('name')).toEqual([{ name: 'asc' }]);
      expect(repo.buildOrderBy(undefined)).toEqual([
        { popularityScore: 'desc' },
        { name: 'asc' },
      ]);
    });
  });
});
