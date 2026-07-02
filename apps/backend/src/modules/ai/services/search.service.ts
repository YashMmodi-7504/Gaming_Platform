import { Injectable } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { embed, nearest, parseQuery, type SearchIntent } from '@gaming-platform/ai-core';

import { PrismaService } from '../../database/prisma.service';
import { TournamentService } from '../../tournament/services/tournament.service';
import { RecommendationService } from './recommendation.service';
import { FraudService } from './fraud.service';

/**
 * Natural-language smart search. Parses free text into a typed intent and
 * executes it against the catalog, tournaments or player data — with a semantic
 * embedding fallback for fuzzy game queries.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentService,
    private readonly recommendations: RecommendationService,
    private readonly fraud: FraudService,
  ) {}

  async search(query: string) {
    const intent = parseQuery(query);
    if (intent.entity === 'tournament') return { intent, results: await this.searchTournaments(intent) };
    if (intent.entity === 'player') return { intent, results: await this.searchPlayers(intent) };
    return { intent, results: await this.searchGames(intent) };
  }

  private async searchGames(intent: SearchIntent) {
    const catalog = await this.recommendations.catalog();
    let games = catalog;
    if (intent.filters.category) games = games.filter((g) => g.category === intent.filters.category);
    if (intent.filters.rtpMin) games = games.filter((g) => g.rtp >= intent.filters.rtpMin!);
    if (intent.filters.isNew) games = games.filter((g) => g.recency >= 0.8);
    if (intent.filters.trending) games = games.filter((g) => g.isTrending);

    // Semantic fallback when free keywords narrow the intent.
    if (intent.keywords.length > 0 && games.length === catalog.length) {
      const vectors = catalog.map((g) => ({ id: g.id, vector: embed(`${g.category} ${g.name}`) }));
      const top = nearest(embed(intent.keywords.join(' ')), vectors, 20);
      const byId = new Map(catalog.map((g) => [g.id, g]));
      games = top.map((t) => byId.get(t.id)!).filter(Boolean);
    }

    if (intent.sort === 'rtp') games = [...games].sort((a, b) => b.rtp - a.rtp);
    else if (intent.sort === 'popularity') games = [...games].sort((a, b) => b.popularity - a.popularity);

    return games.slice(0, 24);
  }

  private async searchTournaments(intent: SearchIntent) {
    const status = intent.filters.status === 'live' ? 'live' : intent.filters.today ? 'registration' : undefined;
    let list = await this.tournaments.list(status ? { status } : {});
    if (intent.filters.free) list = list.filter((t) => Number(t.entryFee) === 0);
    return list.slice(0, 24);
  }

  private async searchPlayers(intent: SearchIntent) {
    if (intent.filters.suspicious) return this.fraud.scan(50);
    const term = intent.keywords.join(' ');
    const users = await this.prisma.user.findMany({
      where: term
        ? { OR: [{ email: { contains: term, mode: 'insensitive' } }, { username: { contains: term, mode: 'insensitive' } }] }
        : {},
      take: 24,
      select: { id: true, username: true, email: true, status: true, createdAt: true },
    });
    return users;
  }

  /** Active games matching a structured query (used by the catalog search box). */
  async catalogSearch(term: string) {
    return this.prisma.game.findMany({
      where: {
        status: GameStatus.ACTIVE,
        deletedAt: null,
        OR: [{ name: { contains: term, mode: 'insensitive' } }, { slug: { contains: term, mode: 'insensitive' } }],
      },
      take: 20,
      select: { id: true, slug: true, name: true, rtp: true },
    });
  }
}
