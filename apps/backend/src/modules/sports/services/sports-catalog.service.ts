import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import {
  MARKET_TEMPLATES,
  SPORT_PRESETS,
  SportResolver,
  type Competition,
  type Market,
  type Match,
  type MatchResult,
  type SportDefinition,
} from '@gaming-platform/sports-engine';

import { PrismaService } from '../../database/prisma.service';

const ENV = 'production';
const SCOPE_SPORT = 'sports-sport';
const SCOPE_COMPETITION = 'sports-competition';
const SCOPE_MATCH = 'sports-match';

/**
 * The data-driven sports catalog. Sports, competitions and matches (with their
 * markets, odds and results) are stored as configuration in `ApplicationSetting`
 * so new sports/competitions/matches/markets are added by data — never by new
 * backend code. Built-in sport definitions ship with the engine.
 */
@Injectable()
export class SportsCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Sports --------------------------------------------------------------

  async listSports(): Promise<SportDefinition[]> {
    const custom = await this.loadScope<SportDefinition>(SCOPE_SPORT);
    const resolver = new SportResolver(Object.fromEntries(custom));
    return resolver.all();
  }

  async getSport(key: string): Promise<SportDefinition> {
    const custom = await this.loadScope<SportDefinition>(SCOPE_SPORT);
    const resolver = new SportResolver(Object.fromEntries(custom));
    if (!resolver.has(key)) throw new NotFoundException(`Unknown sport "${key}"`);
    return resolver.resolve(key);
  }

  async upsertSport(sport: SportDefinition): Promise<SportDefinition> {
    await this.save(SCOPE_SPORT, sport.key, sport);
    return sport;
  }

  async removeSport(key: string): Promise<{ success: true }> {
    if (SPORT_PRESETS[key]) throw new ConflictException('Built-in sports cannot be removed');
    await this.del(SCOPE_SPORT, key);
    return { success: true };
  }

  marketTemplates() {
    return Object.values(MARKET_TEMPLATES);
  }

  // ---- Competitions --------------------------------------------------------

  async listCompetitions(sportKey?: string): Promise<Competition[]> {
    const all = [...(await this.loadScope<Competition>(SCOPE_COMPETITION)).values()];
    return (sportKey ? all.filter((c) => c.sportKey === sportKey) : all).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async getCompetition(key: string): Promise<Competition> {
    const row = await this.read<Competition>(SCOPE_COMPETITION, key);
    if (!row) throw new NotFoundException(`Unknown competition "${key}"`);
    return row;
  }

  async upsertCompetition(competition: Competition): Promise<Competition> {
    await this.getSport(competition.sportKey); // validates sport exists
    await this.save(SCOPE_COMPETITION, competition.key, competition);
    return competition;
  }

  async removeCompetition(key: string): Promise<{ success: true }> {
    await this.del(SCOPE_COMPETITION, key);
    return { success: true };
  }

  // ---- Matches -------------------------------------------------------------

  async listMatches(filters: {
    competitionKey?: string;
    sportKey?: string;
    status?: string;
  } = {}): Promise<Match[]> {
    let all = [...(await this.loadScope<Match>(SCOPE_MATCH)).values()];
    if (filters.competitionKey) all = all.filter((m) => m.competitionKey === filters.competitionKey);
    if (filters.sportKey) all = all.filter((m) => m.sportKey === filters.sportKey);
    if (filters.status) all = all.filter((m) => m.status === filters.status);
    return all.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getMatch(id: string): Promise<Match> {
    const row = await this.read<Match>(SCOPE_MATCH, id);
    if (!row) throw new NotFoundException(`Unknown match "${id}"`);
    return row;
  }

  /** Fetch many matches by id (for settling a multi-leg slip). */
  async getMatches(ids: string[]): Promise<Map<string, Match>> {
    const map = new Map<string, Match>();
    const rows = await this.loadScope<Match>(SCOPE_MATCH);
    for (const id of ids) {
      const match = rows.get(id);
      if (match) map.set(id, match);
    }
    return map;
  }

  async upsertMatch(match: Match): Promise<Match> {
    await this.getCompetition(match.competitionKey); // validates competition exists
    this.validateMarkets(match.markets);
    await this.save(SCOPE_MATCH, match.id, match);
    return match;
  }

  async setMatchStatus(id: string, status: Match['status']): Promise<Match> {
    const match = await this.getMatch(id);
    match.status = status;
    await this.save(SCOPE_MATCH, id, match);
    return match;
  }

  /** Update a single selection's odds (live odds management). */
  async updateOdds(id: string, marketId: string, selectionId: string, odds: number): Promise<Match> {
    const match = await this.getMatch(id);
    const market = match.markets.find((m) => m.id === marketId);
    const selection = market?.selections.find((s) => s.id === selectionId);
    if (!market || !selection) throw new NotFoundException('Market or selection not found');
    selection.odds = odds;
    await this.save(SCOPE_MATCH, id, match);
    return match;
  }

  async setMarketStatus(id: string, marketId: string, status: Market['status']): Promise<Match> {
    const match = await this.getMatch(id);
    const market = match.markets.find((m) => m.id === marketId);
    if (!market) throw new NotFoundException('Market not found');
    market.status = status;
    await this.save(SCOPE_MATCH, id, match);
    return match;
  }

  /** Attach a result feed and mark the match finished (ready to settle bets). */
  async settleMatch(id: string, result: MatchResult): Promise<Match> {
    const match = await this.getMatch(id);
    match.result = result;
    match.status = 'settled';
    for (const market of match.markets) market.status = 'settled';
    await this.save(SCOPE_MATCH, id, match);
    return match;
  }

  async removeMatch(id: string): Promise<{ success: true }> {
    await this.del(SCOPE_MATCH, id);
    return { success: true };
  }

  async statistics() {
    const [sports, competitions, matches] = await Promise.all([
      this.listSports(),
      this.listCompetitions(),
      this.listMatches(),
    ]);
    return {
      sports: sports.length,
      competitions: competitions.length,
      matches: matches.length,
      live: matches.filter((m) => m.status === 'live').length,
      upcoming: matches.filter((m) => m.status === 'scheduled').length,
      settled: matches.filter((m) => m.status === 'settled').length,
      marketTemplates: Object.keys(MARKET_TEMPLATES).length,
    };
  }

  // ---- internals -----------------------------------------------------------

  private validateMarkets(markets: Market[]): void {
    for (const market of markets) {
      if (!MARKET_TEMPLATES[market.templateKey]) {
        throw new ConflictException(`Unknown market template "${market.templateKey}"`);
      }
      if (market.selections.length === 0) {
        throw new ConflictException(`Market "${market.id}" requires selections`);
      }
    }
  }

  private async loadScope<T>(scope: string): Promise<Map<string, T>> {
    const rows = await this.prisma.applicationSetting.findMany({ where: { scope, environment: ENV } });
    const map = new Map<string, T>();
    for (const row of rows) map.set(row.key, row.value as unknown as T);
    return map;
  }

  private async read<T>(scope: string, key: string): Promise<T | null> {
    const row = await this.prisma.applicationSetting.findUnique({
      where: { scope_key_environment: { scope, key, environment: ENV } },
    });
    return row ? (row.value as unknown as T) : null;
  }

  private async save(scope: string, key: string, value: unknown): Promise<void> {
    await this.prisma.applicationSetting.upsert({
      where: { scope_key_environment: { scope, key, environment: ENV } },
      update: { value: value as Prisma.InputJsonValue },
      create: {
        scope,
        key,
        environment: ENV,
        valueType: 'JSON',
        value: value as Prisma.InputJsonValue,
      },
    });
  }

  private async del(scope: string, key: string): Promise<void> {
    await this.prisma.applicationSetting
      .delete({ where: { scope_key_environment: { scope, key, environment: ENV } } })
      .catch(() => undefined);
  }
}
