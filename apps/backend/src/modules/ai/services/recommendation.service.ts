import { Injectable } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { recommend, similar, trending, type RecItem } from '@gaming-platform/ai-core';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TournamentService } from '../../tournament/services/tournament.service';

export interface CatalogGame {
  id: string;
  slug: string;
  name: string;
  category: string;
  rtp: number;
  popularity: number;
  recency: number;
  isTrending: boolean;
}

const CATALOG_KEY = 'ai:catalog:items';
const CATALOG_TTL = 300;

/**
 * Recommendation & personalization. Builds a catalog of content-embeddable game
 * items, derives each player's taste from session history, and produces
 * recommended / similar / trending lists plus "recently played", "continue
 * playing" and tournament suggestions — all from the deterministic ai-core engine.
 */
@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tournaments: TournamentService,
  ) {}

  /** Active catalog as ai-core RecItems (category weighted by repetition). */
  async catalog(): Promise<CatalogGame[]> {
    const cached = await this.redis.get<CatalogGame[]>(CATALOG_KEY);
    if (cached) return cached;
    const games = await this.prisma.game.findMany({
      where: { status: GameStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        rtp: true,
        volatility: true,
        popularityScore: true,
        isNew: true,
        isTrending: true,
        category: { select: { slug: true } },
      },
      take: 1000,
    });
    const items: CatalogGame[] = games.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      category: g.category?.slug ?? 'game',
      rtp: g.rtp ? Number(g.rtp) : 0,
      popularity: g.popularityScore,
      recency: g.isNew ? 1 : g.isTrending ? 0.8 : 0.5,
      isTrending: g.isTrending,
    }));
    await this.redis.set(CATALOG_KEY, items, CATALOG_TTL);
    return items;
  }

  private toRecItems(catalog: CatalogGame[]): RecItem[] {
    return catalog.map((g) => ({
      id: g.id,
      // Repeat the category to weight it above secondary features.
      text: `${g.category} ${g.category} ${g.category} ${g.name} ${g.rtp >= 97 ? 'high-rtp' : 'standard-rtp'}`,
      popularity: g.popularity,
      recency: g.recency,
      rtp: g.rtp,
    }));
  }

  /** Game ids the user has played, most-recent first (deduped). */
  async history(userId: string, limit = 50): Promise<string[]> {
    const sessions = await this.prisma.gameSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { gameId: true },
    });
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const s of sessions) {
      if (!seen.has(s.gameId)) {
        seen.add(s.gameId);
        ordered.push(s.gameId);
      }
      if (ordered.length >= limit) break;
    }
    return ordered;
  }

  private async hydrate(ids: string[], catalog: CatalogGame[]) {
    const byId = new Map(catalog.map((g) => [g.id, g]));
    return ids.map((id) => byId.get(id)).filter((g): g is CatalogGame => !!g);
  }

  async recommended(userId: string, limit = 12) {
    const catalog = await this.catalog();
    const history = await this.history(userId);
    const scored = recommend(this.toRecItems(catalog), { history }, { limit });
    return this.hydrate(scored.map((s) => s.id), catalog);
  }

  async similarTo(gameId: string, limit = 8) {
    const catalog = await this.catalog();
    const scored = similar(gameId, this.toRecItems(catalog), limit);
    return this.hydrate(scored.map((s) => s.id), catalog);
  }

  async trending(limit = 12) {
    const catalog = await this.catalog();
    const scored = trending(this.toRecItems(catalog), limit);
    return this.hydrate(scored.map((s) => s.id), catalog);
  }

  async recentlyPlayed(userId: string, limit = 10) {
    const catalog = await this.catalog();
    return this.hydrate(await this.history(userId, limit), catalog);
  }

  async continuePlaying(userId: string, limit = 6) {
    const open = await this.prisma.gameSession.findMany({
      where: { userId, endedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { gameId: true },
    });
    const catalog = await this.catalog();
    return this.hydrate(
      [...new Set(open.map((s) => s.gameId))],
      catalog,
    );
  }

  /** Tournament suggestions: open-registration events the user can still join. */
  async recommendedTournaments(limit = 6) {
    const open = await this.tournaments.list({ status: 'registration' });
    return open.slice(0, limit);
  }

  /** Personalized "for you" home payload. */
  async forYou(userId: string) {
    const [recommended, trendingGames, recentlyPlayed, continuePlaying, tournaments] = await Promise.all([
      this.recommended(userId, 12),
      this.trending(12),
      this.recentlyPlayed(userId, 10),
      this.continuePlaying(userId, 6),
      this.recommendedTournaments(6),
    ]);
    return { recommended, trending: trendingGames, recentlyPlayed, continuePlaying, tournaments };
  }
}
