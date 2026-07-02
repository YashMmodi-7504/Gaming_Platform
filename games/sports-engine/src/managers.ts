import type {
  Competition,
  Match,
  Market,
  Participant,
  SportDefinition,
} from './types';

/** Generic in-memory keyed store backing the catalog managers. */
class KeyedStore<T> {
  protected readonly items = new Map<string, T>();

  set(key: string, value: T): T {
    this.items.set(key, value);
    return value;
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  has(key: string): boolean {
    return this.items.has(key);
  }

  remove(key: string): boolean {
    return this.items.delete(key);
  }

  list(): T[] {
    return [...this.items.values()];
  }

  clear(): void {
    this.items.clear();
  }

  get size(): number {
    return this.items.size;
  }
}

/** Registry of sports (data-driven definitions). */
export class SportManager extends KeyedStore<SportDefinition> {
  register(sport: SportDefinition): SportDefinition {
    return this.set(sport.key, sport);
  }
}

/** Registry of competitions, filterable by sport. */
export class CompetitionManager extends KeyedStore<Competition> {
  register(competition: Competition): Competition {
    return this.set(competition.key, competition);
  }

  bySport(sportKey: string): Competition[] {
    return this.list().filter((c) => c.sportKey === sportKey);
  }
}

/** Tournaments are competitions grouped by their `tournament` label. */
export class TournamentManager {
  constructor(private readonly source: CompetitionManager) {}

  list(): string[] {
    return [...new Set(this.source.list().map((c) => c.tournament).filter(Boolean) as string[])];
  }

  competitions(tournament: string): Competition[] {
    return this.source.list().filter((c) => c.tournament === tournament);
  }
}

/** Seasons derived from competition `season` labels. */
export class SeasonManager {
  constructor(private readonly source: CompetitionManager) {}

  list(): string[] {
    return [...new Set(this.source.list().map((c) => c.season).filter(Boolean) as string[])];
  }

  competitions(season: string): Competition[] {
    return this.source.list().filter((c) => c.season === season);
  }
}

/** Registry of matches, filterable by competition / status. */
export class MatchManager extends KeyedStore<Match> {
  register(match: Match): Match {
    return this.set(match.id, match);
  }

  byCompetition(competitionKey: string): Match[] {
    return this.list().filter((m) => m.competitionKey === competitionKey);
  }

  live(): Match[] {
    return this.list().filter((m) => m.status === 'live');
  }

  upcoming(): Match[] {
    return this.list().filter((m) => m.status === 'scheduled');
  }

  market(matchId: string, marketId: string): Market | undefined {
    return this.get(matchId)?.markets.find((mk) => mk.id === marketId);
  }
}

/** Teams / participants indexed across matches. */
export class TeamManager extends KeyedStore<Participant> {
  register(team: Participant): Participant {
    return this.set(team.id, team);
  }
}

/** Players indexed by id (drawn from team rosters). */
export class PlayerManager extends KeyedStore<{ id: string; name: string; teamId?: string }> {
  registerFromTeam(team: Participant): void {
    for (const player of team.players ?? []) {
      this.set(player.id, { ...player, teamId: team.id });
    }
  }
}

/** Minimal typed publish/subscribe event bus for engine events. */
export class EventBus {
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();

  on(type: string, handler: (payload: unknown) => void): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  emit(type: string, payload: unknown): void {
    this.handlers.get(type)?.forEach((h) => h(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export interface BetHistoryEntry {
  betId: string;
  type: string;
  stake: string;
  status: string;
  potentialReturn: string;
  at: number;
}

/** Rolling history of placed/settled slips (most-recent first). */
export class HistoryRecorder {
  private entries: BetHistoryEntry[] = [];

  constructor(private readonly limit = 100) {}

  record(entry: BetHistoryEntry): void {
    this.entries = [entry, ...this.entries].slice(0, this.limit);
  }

  list(): readonly BetHistoryEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }
}

export interface ReplayFrameRecord {
  seq: number;
  type: string;
  data: Record<string, unknown>;
}

/** Records an ordered, replayable stream of betting/settlement frames. */
export class ReplayRecorder {
  private frames: ReplayFrameRecord[] = [];
  private seq = 0;

  record(type: string, data: Record<string, unknown> = {}): void {
    this.frames.push({ seq: this.seq++, type, data });
  }

  serialize() {
    return { frameCount: this.frames.length, frames: this.frames };
  }

  clear(): void {
    this.frames = [];
    this.seq = 0;
  }
}

export interface SportsStatsSnapshot {
  betsPlaced: number;
  betsSettled: number;
  totalStaked: number;
  totalReturned: number;
  bySport: Record<string, number>;
  margin: number;
}

/** Aggregates sportsbook statistics across placed and settled slips. */
export class StatisticsManager {
  private betsPlaced = 0;
  private betsSettled = 0;
  private totalStaked = 0;
  private totalReturned = 0;
  private readonly bySport = new Map<string, number>();

  recordPlacement(stake: number, sportKeys: string[]): void {
    this.betsPlaced += 1;
    this.totalStaked += stake;
    for (const sport of new Set(sportKeys)) {
      this.bySport.set(sport, (this.bySport.get(sport) ?? 0) + 1);
    }
  }

  recordSettlement(returned: number): void {
    this.betsSettled += 1;
    this.totalReturned += returned;
  }

  snapshot(): SportsStatsSnapshot {
    return {
      betsPlaced: this.betsPlaced,
      betsSettled: this.betsSettled,
      totalStaked: this.totalStaked,
      totalReturned: this.totalReturned,
      bySport: Object.fromEntries(this.bySport),
      margin:
        this.totalStaked > 0 ? (this.totalStaked - this.totalReturned) / this.totalStaked : 0,
    };
  }
}
