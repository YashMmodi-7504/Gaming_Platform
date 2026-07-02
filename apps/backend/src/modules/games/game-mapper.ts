import { Prisma } from '@gaming-platform/database';
import type {
  GameDetail,
  GameLaunchInfo,
  GameSummary,
} from '@gaming-platform/types';

/** Relation selection for a catalog card. */
export const gameSummaryInclude = Prisma.validator<Prisma.GameInclude>()({
  category: { select: { slug: true, name: true } },
  provider: { select: { code: true, name: true } },
  tags: { select: { tag: { select: { slug: true } } } },
});

/** Relation selection for the full game detail view. */
export const gameDetailInclude = Prisma.validator<Prisma.GameInclude>()({
  category: { select: { slug: true, name: true } },
  provider: { select: { code: true, name: true } },
  tags: { select: { tag: { select: { slug: true } } } },
  launcher: { select: { key: true, type: true, entryUrl: true } },
  assets: {
    select: { type: true, url: true, locale: true },
    orderBy: { displayOrder: 'asc' },
  },
  versions: {
    select: { version: true, isCurrent: true, changelog: true, releasedAt: true },
    orderBy: { releasedAt: 'desc' },
  },
});

export type GameSummaryPayload = Prisma.GameGetPayload<{ include: typeof gameSummaryInclude }>;
export type GameDetailPayload = Prisma.GameGetPayload<{ include: typeof gameDetailInclude }>;

const decToNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : value.toNumber();

export function toGameSummary(game: GameSummaryPayload): GameSummary {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    thumbnailUrl: game.thumbnailUrl,
    bannerUrl: game.bannerUrl,
    category: game.category ? { slug: game.category.slug, name: game.category.name } : null,
    provider: game.provider ? { code: game.provider.code, name: game.provider.name } : null,
    tags: game.tags.map((t) => t.tag.slug),
    ageRating: game.ageRating,
    status: game.status,
    visibility: game.visibility,
    isNew: game.isNew,
    isFeatured: game.isFeatured,
    isTrending: game.isTrending,
    maintenanceMode: game.maintenanceMode,
    ratingAverage: game.ratingAverage.toNumber(),
    ratingCount: game.ratingCount,
    popularityScore: game.popularityScore,
    rtp: decToNumber(game.rtp),
  };
}

export function toLaunchInfo(game: {
  launchUrl: string | null;
  deepLink: string | null;
  routePath: string | null;
  launcher?: { key: string; type: string; entryUrl: string | null } | null;
}): GameLaunchInfo {
  return {
    type: game.launcher?.type ?? null,
    launcherKey: game.launcher?.key ?? null,
    url: game.launchUrl ?? game.launcher?.entryUrl ?? null,
    deepLink: game.deepLink,
    routePath: game.routePath,
  };
}

export function toGameDetail(game: GameDetailPayload): GameDetail {
  return {
    ...toGameSummary(game),
    description: game.description,
    volatility: game.volatility,
    minBet: game.minBet.toString(),
    maxBet: game.maxBet.toString(),
    supportedDevices: game.supportedDevices,
    supportedLanguages: game.supportedLanguages,
    supportedCurrencies: game.supportedCurrencies,
    seo: {
      title: game.seoTitle,
      description: game.seoDescription,
      keywords: game.seoKeywords,
    },
    launch: toLaunchInfo(game),
    releaseNotes: game.releaseNotes,
    releaseDate: game.releaseDate?.toISOString() ?? null,
    assets: game.assets.map((a) => ({ type: a.type, url: a.url, locale: a.locale })),
    versions: game.versions.map((v) => ({
      version: v.version,
      isCurrent: v.isCurrent,
      changelog: v.changelog,
      releasedAt: v.releasedAt?.toISOString() ?? null,
    })),
  };
}
