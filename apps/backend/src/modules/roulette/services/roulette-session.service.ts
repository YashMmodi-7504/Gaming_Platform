import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import { GameOutcome, GameSessionStatus } from '@prisma/client';
import {
  RouletteEngine,
  type RouletteBet,
  type RouletteRoundResult,
  type RouletteRuleSet,
} from '@gaming-platform/roulette-engine';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { WalletBridgeService } from '../../wallet-engine/services/wallet-bridge.service';
import { RouletteVariantService } from './roulette-variant.service';

interface RouletteSessionRecord {
  sessionId: string; // runtime/roulette session id
  gameSessionId: string | null; // persisted GameSession id
  userId: string;
  gameId: string | null;
  variantKey: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  mode: string;
  status: string;
  createdAt: number;
}

export interface RouletteSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

const KEY = (id: string): string => `roulette:session:${id}`;
const TTL = 60 * 60;

@Injectable()
export class RouletteSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fair: ProvablyFairService,
    private readonly variants: RouletteVariantService,
    private readonly wallet: WalletBridgeService,
  ) {}

  async create(input: {
    userId: string;
    variantKey: string;
    gameId?: string;
    clientSeed?: string;
    mode?: string;
  }): Promise<{ session: RouletteSessionView; ruleset: RouletteRuleSet }> {
    const ruleset = await this.variants.resolve(input.variantKey); // throws if unknown
    const commit = this.fair.createCommit();
    const mode = input.mode ?? 'demo';
    const gameSessionId = await this.maybeCreateGameSession(input.userId, input.gameId, mode);

    const record: RouletteSessionRecord = {
      sessionId: randomUUID(),
      gameSessionId,
      userId: input.userId,
      gameId: input.gameId ?? null,
      variantKey: input.variantKey,
      serverSeed: commit.serverSeed,
      serverSeedHash: commit.serverSeedHash,
      clientSeed: input.clientSeed ?? commit.serverSeedHash,
      nonce: 0,
      mode,
      status: 'active',
      createdAt: Date.now(),
    };
    await this.persist(record);
    return { session: this.toView(record), ruleset };
  }

  async get(id: string, userId: string): Promise<RouletteSessionView> {
    return this.toView(await this.getRecord(id, userId));
  }

  /** Spin the wheel and settle bets for the next nonce. */
  async spin(id: string, userId: string, bets: RouletteBet[]): Promise<RouletteRoundResult> {
    const record = await this.getRecord(id, userId);
    const ruleset = await this.variants.resolve(record.variantKey);
    const seed = this.fair.deriveSeed(record.serverSeed, record.clientSeed, record.nonce);
    const engine = new RouletteEngine(ruleset, seed);
    const result = engine.spin(`${record.sessionId}:${record.nonce}`, bets);

    const usedNonce = record.nonce;
    record.nonce += 1;
    await this.persist(record);
    await this.persistResult(record, result);
    return this.withVerification(result, record, usedNonce, seed);
  }

  // ---- Persistence: save-state / replay / history --------------------------

  async saveState(id: string, userId: string, state: Record<string, unknown>, version: number) {
    const record = await this.getRecord(id, userId);
    const gameSessionId = this.requirePersisted(record);
    const checksum = this.fair.hash(JSON.stringify(state));
    await this.prisma.gameRuntimeState.upsert({
      where: { sessionId: gameSessionId },
      update: { state: state as Prisma.InputJsonValue, snapshotVersion: version, checksum },
      create: {
        sessionId: gameSessionId,
        userId,
        gameId: record.gameId ?? gameSessionId,
        pluginKey: 'roulette-engine',
        state: state as Prisma.InputJsonValue,
        snapshotVersion: version,
        checksum,
      },
    });
    return { saved: true as const, version };
  }

  async getState(id: string, userId: string) {
    const record = await this.getRecord(id, userId);
    const gameSessionId = this.requirePersisted(record);
    const saved = await this.prisma.gameRuntimeState.findUnique({ where: { sessionId: gameSessionId } });
    if (!saved) throw new NotFoundException('No saved state for this session');
    return saved;
  }

  async saveReplay(id: string, userId: string, input: { seed: string; frames: unknown[]; durationMs: number }) {
    const record = await this.getRecord(id, userId);
    const gameSessionId = this.requirePersisted(record);
    return this.prisma.gameReplay.create({
      data: {
        sessionId: gameSessionId,
        userId,
        gameId: record.gameId ?? gameSessionId,
        pluginKey: 'roulette-engine',
        seed: input.seed,
        frames: input.frames as Prisma.InputJsonValue,
        frameCount: input.frames.length,
        durationMs: input.durationMs,
      },
    });
  }

  async listReplays(id: string, userId: string) {
    const record = await this.getRecord(id, userId);
    const gameSessionId = this.requirePersisted(record);
    return this.prisma.gameReplay.findMany({
      where: { sessionId: gameSessionId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }

  async history(id: string, userId: string, limit = 25) {
    const record = await this.getRecord(id, userId);
    if (!record.gameSessionId) return [];
    return this.prisma.gameResult.findMany({
      where: { sessionId: record.gameSessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, roundId: true, outcome: true, betAmount: true, winAmount: true, payload: true, createdAt: true },
    });
  }

  /** Reveal the server seed for full fairness verification, then end. */
  async end(id: string, userId: string) {
    const record = await this.getRecord(id, userId);
    if (record.gameSessionId) {
      await this.prisma.gameSession.update({
        where: { id: record.gameSessionId },
        data: { status: GameSessionStatus.COMPLETED, endedAt: new Date() },
      });
    }
    await this.redis.del(KEY(id));
    return {
      ended: true as const,
      fairness: { serverSeed: record.serverSeed, clientSeed: record.clientSeed, finalNonce: record.nonce },
    };
  }

  async fairness(id: string, userId: string) {
    const record = await this.getRecord(id, userId);
    return {
      serverSeedHash: record.serverSeedHash,
      clientSeed: record.clientSeed,
      nonce: record.nonce,
      // Server seed stays committed until the session ends.
    };
  }

  // ---- internals -----------------------------------------------------------

  /** Used by the realtime gateway to authorise a socket against a session. */
  async getRecord(id: string, userId: string): Promise<RouletteSessionRecord> {
    const record = await this.redis.get<RouletteSessionRecord>(KEY(id));
    if (!record) throw new NotFoundException('Roulette session not found or expired');
    if (record.userId !== userId) throw new ForbiddenException('Not your roulette session');
    return record;
  }

  private persist(record: RouletteSessionRecord): Promise<void> {
    return this.redis.set(KEY(record.sessionId), record, TTL);
  }

  private requirePersisted(record: RouletteSessionRecord): string {
    if (!record.gameSessionId) {
      throw new NotFoundException('This session is not persisted (no game/currency bound)');
    }
    return record.gameSessionId;
  }

  private async persistResult(
    record: RouletteSessionRecord,
    result: RouletteRoundResult,
  ): Promise<void> {
    if (!record.gameSessionId) return;
    const totalWin = Number(result.settlement.totalWin);
    const totalBet = Number(result.settlement.totalBet);
    const outcome =
      totalWin > totalBet ? GameOutcome.WIN : totalWin === totalBet ? GameOutcome.PUSH : GameOutcome.LOSS;
    await this.prisma.gameResult.create({
      data: {
        sessionId: record.gameSessionId,
        userId: record.userId,
        gameId: record.gameId ?? record.gameSessionId,
        roundId: result.roundId,
        outcome,
        betAmount: result.settlement.totalBet,
        winAmount: result.settlement.totalWin,
        payload: {
          pocket: result.pocket,
          label: result.pocketLabel,
          color: result.color,
          winningBets: result.winningBets,
        } as Prisma.InputJsonValue,
      },
    });
    const session = await this.prisma.gameSession.update({
      where: { id: record.gameSessionId },
      data: {
        roundsPlayed: { increment: 1 },
        totalBet: { increment: result.settlement.totalBet },
        totalWin: { increment: result.settlement.totalWin },
      },
      select: { currencyId: true },
    });
    // Real-money settlement flows through the Wallet Engine (reserve+commit).
    await this.wallet.settleImmediate({
      userId: record.userId,
      currencyId: session.currencyId,
      betAmount: result.settlement.totalBet,
      winAmount: result.settlement.totalWin,
      reference: `roulette:${result.roundId}`,
      idempotencyKey: `roulette:${result.roundId}`,
    });
  }

  private withVerification(
    result: RouletteRoundResult,
    record: RouletteSessionRecord,
    nonce: number,
    seed: string,
  ): RouletteRoundResult {
    return {
      ...result,
      verification: { seed, serverSeedHash: record.serverSeedHash, clientSeed: record.clientSeed, nonce },
    };
  }

  private async maybeCreateGameSession(
    userId: string,
    gameId: string | undefined,
    mode: string,
  ): Promise<string | null> {
    if (!gameId) return null;
    const game = await this.prisma.game.findFirst({
      where: { id: gameId, deletedAt: null },
      select: { id: true, currencyId: true },
    });
    if (!game) return null;
    const currencyId =
      game.currencyId ??
      (await this.prisma.currency.findFirst({ where: { isActive: true }, select: { id: true } }))?.id;
    if (!currencyId) return null;
    const session = await this.prisma.gameSession.create({
      data: { userId, gameId: game.id, currencyId, mode },
      select: { id: true },
    });
    return session.id;
  }

  private toView(record: RouletteSessionRecord): RouletteSessionView {
    return {
      sessionId: record.sessionId,
      gameSessionId: record.gameSessionId,
      variantKey: record.variantKey,
      mode: record.mode,
      status: record.status,
      fairness: {
        serverSeedHash: record.serverSeedHash,
        clientSeed: record.clientSeed,
        nonce: record.nonce,
      },
    };
  }
}
