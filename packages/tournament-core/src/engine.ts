import { generateBracket, pairKey, swissPairing } from './bracket';
import { TournamentLifecycle } from './lifecycle';
import { distributePrizes, computePool, type RankedEntry } from './prizes';
import { rankParticipants, type Standing } from './ranking';
import type {
  Award,
  Bracket,
  Match,
  Participant,
  PrizeConfig,
  TournamentFormat,
  TournamentStatus,
} from './types';

export class TournamentError extends Error {}

const WIN_POINTS = 3;
const DRAW_POINTS = 1;

export interface TournamentConfig {
  format: TournamentFormat;
  capacity: number;
  entryFee: string;
  prize: PrizeConfig;
}

/**
 * The pure tournament aggregate: registration, seeding, bracket generation,
 * match reporting with automatic advancement, standings and prize distribution.
 * Deterministic and side-effect free — the backend service mirrors its decisions
 * onto persistence, Redis and the Wallet Engine.
 */
export class TournamentEngine {
  status: TournamentStatus = 'draft';
  bracket: Bracket | null = null;
  swissRound = 0;
  private readonly participants = new Map<string, Participant>();
  private readonly eliminatedRound = new Map<string, number>();
  private readonly playedPairs = new Set<string>();

  constructor(readonly config: TournamentConfig) {}

  /**
   * Reconstruct an engine from persisted state (the backend is stateless across
   * requests). Derived indices (eliminations, played Swiss pairings) are rebuilt
   * from the bracket so advancement stays consistent.
   */
  static hydrate(
    config: TournamentConfig,
    state: {
      status: TournamentStatus;
      participants: Participant[];
      bracket: Bracket | null;
      swissRound?: number;
    },
  ): TournamentEngine {
    const engine = new TournamentEngine(config);
    engine.status = state.status;
    engine.bracket = state.bracket;
    engine.swissRound = state.swissRound ?? 0;
    for (const p of state.participants) engine.participants.set(p.id, { ...p });
    if (state.bracket) {
      for (const match of state.bracket.matches) {
        const [a, b] = match.slots;
        if (a.participantId && b.participantId) {
          engine.playedPairs.add(pairKey(a.participantId, b.participantId));
        }
        if (match.state === 'completed' && match.loserId && !match.loserTo) {
          engine.eliminatedRound.set(match.loserId, match.round);
        }
      }
    }
    return engine;
  }

  // ---- Registration --------------------------------------------------------

  register(input: { id: string; userId: string; displayName: string; rating?: number }): Participant {
    if (!TournamentLifecycle.acceptsRegistration(this.status) && this.status !== 'draft') {
      throw new TournamentError('Registration is closed');
    }
    const waitlisted = this.participants.size >= this.config.capacity;
    const participant: Participant = {
      id: input.id,
      userId: input.userId,
      displayName: input.displayName,
      rating: input.rating,
      checkedIn: false,
      status: waitlisted ? 'waitlisted' : 'registered',
      score: 0,
    };
    this.participants.set(participant.id, participant);
    return participant;
  }

  checkIn(participantId: string): void {
    const p = this.require(participantId);
    p.checkedIn = true;
  }

  withdraw(participantId: string): void {
    const p = this.require(participantId);
    p.status = 'withdrawn';
  }

  list(): Participant[] {
    return [...this.participants.values()];
  }

  setStatus(to: TournamentStatus): void {
    this.status = TournamentLifecycle.transition(this.status, to);
  }

  // ---- Start ---------------------------------------------------------------

  /** Promote waitlisted entrants into open seats, then generate the bracket. */
  start(seedOptions: { byRating?: boolean; seed?: number } = {}): Bracket | null {
    // Walk through the legal lifecycle states up to `live`.
    if (this.status === 'draft' || this.status === 'scheduled') this.setStatus('registration');
    if (this.status === 'registration' || this.status === 'checkin') this.setStatus('live');
    const active = this.list().filter((p) => p.status === 'registered' || p.status === 'active');
    active.forEach((p) => {
      p.status = 'active';
    });
    // Deterministic seeding.
    const ordered = seedOptions.byRating
      ? [...active].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      : active;
    ordered.forEach((p, i) => {
      p.seed = i + 1;
    });

    if (this.config.format === 'leaderboard' || this.config.format === 'timed') {
      this.bracket = null;
      return null;
    }
    if (this.config.format === 'swiss') {
      this.swissRound = 1;
      this.bracket = swissPairing(ordered, 1, this.playedPairs);
      this.recordPairs(this.bracket);
      return this.bracket;
    }
    this.bracket = generateBracket(this.config.format, ordered);
    this.resolveByes();
    return this.bracket;
  }

  // ---- Match reporting -----------------------------------------------------

  reportMatch(matchId: string, winnerId: string, scores?: { a: number; b: number }): void {
    if (!this.bracket) throw new TournamentError('No bracket for this format');
    const match = this.bracket.matches.find((m) => m.id === matchId);
    if (!match) throw new TournamentError(`Unknown match "${matchId}"`);
    if (match.state === 'completed') throw new TournamentError('Match already reported');
    const [a, b] = match.slots;
    if (winnerId !== a.participantId && winnerId !== b.participantId) {
      throw new TournamentError('Winner is not in this match');
    }
    const loserId = winnerId === a.participantId ? b.participantId : a.participantId;
    match.winnerId = winnerId;
    match.loserId = loserId;
    match.state = 'completed';
    if (scores) {
      match.slots[0].score = scores.a;
      match.slots[1].score = scores.b;
    }

    this.score(winnerId, WIN_POINTS);
    this.advance(match, winnerId, loserId);
  }

  /** Generate the next Swiss round from current standings. */
  nextSwissRound(): Bracket {
    if (this.config.format !== 'swiss') throw new TournamentError('Not a Swiss tournament');
    if (this.bracket && this.bracket.matches.some((m) => m.state === 'ready')) {
      throw new TournamentError('Current round is not finished');
    }
    this.swissRound += 1;
    this.bracket = swissPairing(this.list(), this.swissRound, this.playedPairs);
    this.recordPairs(this.bracket);
    return this.bracket;
  }

  // ---- Standings & completion ---------------------------------------------

  standings(): Standing[] {
    if (this.config.format === 'single-elimination' || this.config.format === 'double-elimination' || this.config.format === 'knockout') {
      return this.eliminationStandings();
    }
    return rankParticipants(this.list().filter((p) => p.status !== 'withdrawn'));
  }

  champion(): Participant | null {
    const top = this.standings()[0];
    return top ? this.participants.get(top.participantId) ?? null : null;
  }

  /** Compute the prize pool and award distribution for the final standings. */
  complete(): { pool: string; awards: Award[] } {
    const entrants = this.list().filter((p) => p.status !== 'withdrawn').length;
    const pool = computePool(this.config.prize, entrants, this.config.entryFee);
    const ranked: RankedEntry[] = this.standings().map((s) => ({
      participantId: s.participantId,
      userId: s.userId,
      rank: s.rank,
    }));
    const awards = distributePrizes(this.config.prize, pool, ranked);
    this.setStatus('completed');
    return { pool, awards };
  }

  // ---- internals -----------------------------------------------------------

  private advance(match: Match, winnerId: string, loserId: string | null): void {
    if (match.winnerTo) {
      this.place(match.winnerTo.matchId, match.winnerTo.slot, winnerId);
    }
    if (match.loserTo && loserId) {
      this.place(match.loserTo.matchId, match.loserTo.slot, loserId);
    } else if (loserId && this.isElimination()) {
      const loser = this.participants.get(loserId);
      if (loser) loser.status = 'eliminated';
      this.eliminatedRound.set(loserId, match.round);
    }
  }

  private place(matchId: string, slot: 0 | 1, participantId: string): void {
    const target = this.bracket!.matches.find((m) => m.id === matchId);
    if (!target) return;
    target.slots[slot].participantId = participantId;
    const [a, b] = target.slots;
    if (a.participantId && b.participantId && target.state !== 'completed') target.state = 'ready';
  }

  private resolveByes(): void {
    if (!this.bracket) return;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const match of this.bracket.matches) {
        if (match.state !== 'bye' || match.winnerId) continue;
        const winnerId = match.slots[0].participantId ?? match.slots[1].participantId;
        if (!winnerId) continue;
        match.winnerId = winnerId;
        match.state = 'completed';
        if (match.winnerTo) this.place(match.winnerTo.matchId, match.winnerTo.slot, winnerId);
        progressed = true;
      }
    }
  }

  private eliminationStandings(): Standing[] {
    const ranked = [...this.participants.values()]
      .filter((p) => p.status !== 'withdrawn')
      .sort((a, b) => {
        const ra = this.eliminatedRound.get(a.id) ?? Infinity;
        const rb = this.eliminatedRound.get(b.id) ?? Infinity;
        return rb - ra || (a.seed ?? 0) - (b.seed ?? 0);
      });
    let lastRound: number | null = null;
    let lastRank = 0;
    return ranked.map((p, index) => {
      const round = this.eliminatedRound.get(p.id) ?? Infinity;
      const rank = lastRound !== null && round === lastRound ? lastRank : index + 1;
      lastRound = round;
      lastRank = rank;
      return { participantId: p.id, userId: p.userId, displayName: p.displayName, rank, score: p.score };
    });
  }

  private score(participantId: string, points: number): void {
    const p = this.participants.get(participantId);
    if (p && (this.config.format === 'round-robin' || this.config.format === 'swiss' || this.config.format === 'leaderboard')) {
      p.score += points;
    }
  }

  private recordPairs(bracket: Bracket): void {
    for (const match of bracket.matches) {
      const [a, b] = match.slots;
      if (a.participantId && b.participantId) this.playedPairs.add(pairKey(a.participantId, b.participantId));
    }
  }

  private isElimination(): boolean {
    return (
      this.config.format === 'single-elimination' ||
      this.config.format === 'double-elimination' ||
      this.config.format === 'knockout'
    );
  }

  private require(id: string): Participant {
    const p = this.participants.get(id);
    if (!p) throw new TournamentError(`Unknown participant "${id}"`);
    return p;
  }
}

export const DRAW_POINTS_VALUE = DRAW_POINTS;
