import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import {
  TournamentEngine,
  type Award,
  type Bracket,
  type Participant,
  type PrizeConfig,
  type TournamentConfig,
  type TournamentFormat,
  type TournamentStatus,
} from '@gaming-platform/tournament-core';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WalletBridgeService } from '../../wallet-engine/services/wallet-bridge.service';
import { TournamentGateway } from '../tournament.gateway';

const SCOPE = 'tournament';
const ENV = 'production';

export interface StoredTournament {
  id: string;
  name: string;
  description: string;
  format: TournamentFormat;
  status: TournamentStatus;
  registrationMode: 'open' | 'invite' | 'password' | 'private';
  cadence: 'one-off' | 'daily' | 'weekly' | 'monthly' | 'season';
  capacity: number;
  entryFee: string;
  currencyId: string | null;
  password?: string;
  invited: string[];
  allowLateJoin: boolean;
  autoCheckIn: boolean;
  prize: PrizeConfig;
  participants: Participant[];
  bracket: Bracket | null;
  swissRound: number;
  awards: Award[];
  startsAt: string | null;
  createdAt: number;
}

export interface TournamentSummary {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  cadence: string;
  capacity: number;
  registered: number;
  entryFee: string;
  prizePool: string;
  startsAt: string | null;
}

/**
 * The Tournament Engine service. Tournament definitions and live state are stored
 * as configuration (`ApplicationSetting`, scope `tournament`) so new tournaments
 * are data — never code. The pure {@link TournamentEngine} drives every decision;
 * paid entry and prize payout go through the Wallet Engine; updates broadcast via
 * Socket.IO.
 */
@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wallet: WalletBridgeService,
    private readonly gateway: TournamentGateway,
  ) {}

  // ---- Read ----------------------------------------------------------------

  async list(filter: { status?: string } = {}): Promise<TournamentSummary[]> {
    const all = await this.loadAll();
    const filtered = filter.status ? all.filter((t) => t.status === filter.status) : all;
    return filtered
      .sort((a, b) => (b.startsAt ?? '').localeCompare(a.startsAt ?? ''))
      .map((t) => this.toSummary(t));
  }

  async get(id: string): Promise<StoredTournament> {
    const row = await this.read(id);
    if (!row) throw new NotFoundException(`Tournament "${id}" not found`);
    return row;
  }

  async detail(id: string) {
    const t = await this.get(id);
    return {
      ...this.toSummary(t),
      description: t.description,
      registrationMode: t.registrationMode,
      prize: t.prize,
      bracket: t.bracket,
      participants: t.participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        seed: p.seed,
        status: p.status,
        score: p.score,
      })),
      standings: t.status === 'completed' || t.bracket === null ? this.engineFor(t).standings() : [],
      awards: t.awards,
    };
  }

  // ---- Admin: create / update / lifecycle ----------------------------------

  async create(input: Partial<StoredTournament> & { name: string; format: TournamentFormat }): Promise<StoredTournament> {
    const id = input.id ?? `tnmt-${randomUUID()}`;
    const tournament: StoredTournament = {
      id,
      name: input.name,
      description: input.description ?? '',
      format: input.format,
      status: 'draft',
      registrationMode: input.registrationMode ?? 'open',
      cadence: input.cadence ?? 'one-off',
      capacity: input.capacity ?? 64,
      entryFee: input.entryFee ?? '0',
      currencyId: input.currencyId ?? null,
      password: input.password,
      invited: input.invited ?? [],
      allowLateJoin: input.allowLateJoin ?? false,
      autoCheckIn: input.autoCheckIn ?? true,
      prize: input.prize ?? {
        type: 'winner-take-all',
        currencyId: input.currencyId ?? null,
        guaranteed: '0',
        entryContribution: 1,
        tiers: [{ fromRank: 1, toRank: 1, value: 1 }],
      },
      participants: [],
      bracket: null,
      swissRound: 0,
      awards: [],
      startsAt: input.startsAt ?? null,
      createdAt: Date.now(),
    };
    await this.save(tournament);
    return tournament;
  }

  async update(id: string, patch: Partial<StoredTournament>): Promise<StoredTournament> {
    const t = await this.get(id);
    if (t.status !== 'draft' && t.status !== 'scheduled') {
      throw new ConflictException('Only draft/scheduled tournaments can be edited');
    }
    const next = { ...t, ...patch, id: t.id, participants: t.participants };
    await this.save(next);
    return next;
  }

  async openRegistration(id: string): Promise<StoredTournament> {
    return this.transition(id, 'registration');
  }

  async cancel(id: string): Promise<StoredTournament> {
    const t = await this.get(id);
    // Refund entry fees on cancellation.
    if (t.currencyId && Number(t.entryFee) > 0) {
      for (const p of t.participants) {
        await this.wallet.settleImmediate({
          userId: p.userId,
          currencyId: t.currencyId,
          betAmount: '0',
          winAmount: t.entryFee,
          reference: `tnmt:${t.id}:refund:${p.id}`,
          idempotencyKey: `tnmt:${t.id}:refund:${p.id}`,
        });
      }
    }
    return this.transition(id, 'cancelled');
  }

  /** Start: seed, generate the bracket and go live. */
  async start(id: string): Promise<StoredTournament> {
    const t = await this.get(id);
    const engine = this.engineFor(t);
    engine.start({ byRating: true });
    t.status = engine.status;
    t.bracket = engine.bracket;
    t.swissRound = engine.swissRound;
    t.participants = engine.list();
    await this.save(t);
    this.gateway.emitTournament(t.id, { type: 'started', status: t.status, bracket: t.bracket });
    return t;
  }

  // ---- Registration --------------------------------------------------------

  async register(id: string, userId: string, displayName: string, password?: string): Promise<StoredTournament> {
    const t = await this.get(id);
    if (t.status !== 'registration' && !(t.allowLateJoin && t.status === 'live')) {
      throw new ConflictException('Registration is not open');
    }
    if (t.registrationMode === 'password' && t.password && t.password !== password) {
      throw new ForbiddenException('Invalid tournament password');
    }
    if ((t.registrationMode === 'invite' || t.registrationMode === 'private') && !t.invited.includes(userId)) {
      throw new ForbiddenException('You are not invited to this tournament');
    }
    if (t.participants.some((p) => p.userId === userId)) {
      throw new ConflictException('Already registered');
    }

    // Collect the entry fee through the Wallet Engine (paid tournaments).
    if (t.currencyId && Number(t.entryFee) > 0) {
      await this.wallet.settleImmediate({
        userId,
        currencyId: t.currencyId,
        betAmount: t.entryFee,
        winAmount: '0',
        reference: `tnmt:${t.id}:entry:${userId}`,
        idempotencyKey: `tnmt:${t.id}:entry:${userId}`,
      });
    }

    const engine = this.engineFor(t);
    const participant = engine.register({ id: `pt-${randomUUID()}`, userId, displayName });
    if (t.autoCheckIn) engine.checkIn(participant.id);
    t.participants = engine.list();
    await this.save(t);
    this.gateway.emitTournament(t.id, { type: 'registered', registered: t.participants.length });
    return t;
  }

  async checkIn(id: string, userId: string): Promise<void> {
    const t = await this.get(id);
    const participant = t.participants.find((p) => p.userId === userId);
    if (!participant) throw new NotFoundException('Not registered');
    participant.checkedIn = true;
    await this.save(t);
  }

  async withdraw(id: string, userId: string): Promise<void> {
    const t = await this.get(id);
    const participant = t.participants.find((p) => p.userId === userId);
    if (!participant) throw new NotFoundException('Not registered');
    participant.status = 'withdrawn';
    await this.save(t);
  }

  // ---- Match reporting & completion ----------------------------------------

  async reportMatch(id: string, matchId: string, winnerParticipantId: string, scores?: { a: number; b: number }): Promise<StoredTournament> {
    const t = await this.get(id);
    if (t.status !== 'live') throw new ConflictException('Tournament is not live');
    const engine = this.engineFor(t);
    engine.reportMatch(matchId, winnerParticipantId, scores);
    t.bracket = engine.bracket;
    t.participants = engine.list();
    await this.save(t);
    this.gateway.emitBracket(t.id, t.bracket);
    return t;
  }

  /** Complete the tournament: rank, distribute the pool via the Wallet Engine. */
  async complete(id: string): Promise<{ pool: string; awards: Award[] }> {
    const t = await this.get(id);
    if (t.status !== 'live') throw new ConflictException('Tournament is not live');
    const engine = this.engineFor(t);
    const { pool, awards } = engine.complete();
    t.status = 'completed';
    t.participants = engine.list();
    t.awards = awards;

    // Pay prizes through the Wallet Engine; record leaderboard entries.
    if (t.currencyId) {
      for (const award of awards) {
        if (Number(award.amount) <= 0) continue;
        await this.wallet.settleImmediate({
          userId: award.userId,
          currencyId: t.currencyId,
          betAmount: '0',
          winAmount: award.amount,
          reference: `tnmt:${t.id}:prize:${award.participantId}`,
          idempotencyKey: `tnmt:${t.id}:prize:${award.participantId}`,
        });
      }
    }
    await this.save(t);
    this.gateway.emitTournament(t.id, { type: 'completed', awards });
    return { pool, awards };
  }

  async statistics() {
    const all = await this.loadAll();
    return {
      total: all.length,
      live: all.filter((t) => t.status === 'live').length,
      registration: all.filter((t) => t.status === 'registration').length,
      completed: all.filter((t) => t.status === 'completed').length,
      totalParticipants: all.reduce((sum, t) => sum + t.participants.length, 0),
    };
  }

  // ---- internals -----------------------------------------------------------

  private engineFor(t: StoredTournament): TournamentEngine {
    const config: TournamentConfig = {
      format: t.format,
      capacity: t.capacity,
      entryFee: t.entryFee,
      prize: t.prize,
    };
    return TournamentEngine.hydrate(config, {
      status: t.status,
      participants: t.participants,
      bracket: t.bracket,
      swissRound: t.swissRound,
    });
  }

  private async transition(id: string, to: TournamentStatus): Promise<StoredTournament> {
    const t = await this.get(id);
    const engine = this.engineFor(t);
    engine.setStatus(to);
    t.status = engine.status;
    await this.save(t);
    this.gateway.emitTournament(t.id, { type: 'status', status: t.status });
    return t;
  }

  private toSummary(t: StoredTournament): TournamentSummary {
    const pool = this.estimatePool(t);
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      status: t.status,
      cadence: t.cadence,
      capacity: t.capacity,
      registered: t.participants.filter((p) => p.status !== 'withdrawn').length,
      entryFee: t.entryFee,
      prizePool: pool,
      startsAt: t.startsAt,
    };
  }

  private estimatePool(t: StoredTournament): string {
    const entrants = t.participants.filter((p) => p.status !== 'withdrawn').length;
    const dynamic = Number(t.entryFee) * entrants * t.prize.entryContribution;
    return (Number(t.prize.guaranteed) + dynamic).toString();
  }

  private async loadAll(): Promise<StoredTournament[]> {
    const rows = await this.prisma.applicationSetting.findMany({ where: { scope: SCOPE, environment: ENV } });
    return rows.map((r) => r.value as unknown as StoredTournament);
  }

  private async read(id: string): Promise<StoredTournament | null> {
    const row = await this.prisma.applicationSetting.findUnique({
      where: { scope_key_environment: { scope: SCOPE, key: id, environment: ENV } },
    });
    return row ? (row.value as unknown as StoredTournament) : null;
  }

  private async save(t: StoredTournament): Promise<void> {
    if (t.participants.length > t.capacity * 4) {
      throw new BadRequestException('Participant list exceeds safe bounds');
    }
    await this.prisma.applicationSetting.upsert({
      where: { scope_key_environment: { scope: SCOPE, key: t.id, environment: ENV } },
      update: { value: t as unknown as Prisma.InputJsonValue },
      create: { scope: SCOPE, key: t.id, environment: ENV, valueType: 'JSON', value: t as unknown as Prisma.InputJsonValue },
    });
    await this.redis.del(`tournament:${t.id}`);
  }
}
