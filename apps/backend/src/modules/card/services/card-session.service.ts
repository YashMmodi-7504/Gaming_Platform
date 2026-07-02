import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import { GameOutcome, GameSessionStatus } from '@prisma/client';
import { CardEngine, type CardGameRuleSet, type CardRoundResult } from '@gaming-platform/card-engine';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { WalletBridgeService } from '../../wallet-engine/services/wallet-bridge.service';
import { CardVariantService } from './card-variant.service';
import type { PlacedBetInput } from './card-engine.service';

interface BlackjackState {
  roundId: string;
  seed: string;
  bets: PlacedBetInput[];
  hits: number;
}

interface CardSessionRecord {
  sessionId: string; // runtime/card session id
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
  blackjack: BlackjackState | null;
  createdAt: number;
}

export interface CardSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

const KEY = (id: string): string => `card:session:${id}`;
const TTL = 60 * 60;

@Injectable()
export class CardSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fair: ProvablyFairService,
    private readonly variants: CardVariantService,
    private readonly wallet: WalletBridgeService,
  ) {}

  async create(input: {
    userId: string;
    variantKey: string;
    gameId?: string;
    clientSeed?: string;
    mode?: string;
  }): Promise<{ session: CardSessionView; ruleset: CardGameRuleSet }> {
    const ruleset = await this.variants.resolve(input.variantKey); // throws if unknown
    const commit = this.fair.createCommit();
    const mode = input.mode ?? 'demo';
    const gameSessionId = await this.maybeCreateGameSession(input.userId, input.gameId, mode);

    const record: CardSessionRecord = {
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
      blackjack: null,
      createdAt: Date.now(),
    };
    await this.persist(record);
    return { session: this.toView(record), ruleset };
  }

  async get(id: string, userId: string): Promise<CardSessionView> {
    return this.toView(await this.getRecord(id, userId));
  }

  // ---- Auto-resolve rounds -------------------------------------------------

  async playRound(id: string, userId: string, bets: PlacedBetInput[]): Promise<CardRoundResult> {
    const record = await this.getRecord(id, userId);
    const ruleset = await this.variants.resolve(record.variantKey);
    const seed = this.fair.deriveSeed(record.serverSeed, record.clientSeed, record.nonce);
    const engine = new CardEngine(ruleset, seed);
    const result = engine.playRound(`${record.sessionId}:${record.nonce}`, bets);

    record.nonce += 1;
    await this.persist(record);
    await this.persistResult(record, result);
    return this.withVerification(result, record, record.nonce - 1, seed);
  }

  // ---- Interactive blackjack ----------------------------------------------

  async blackjackDeal(id: string, userId: string, bets: PlacedBetInput[]) {
    const record = await this.getRecord(id, userId);
    const ruleset = await this.variants.resolve(record.variantKey);
    const seed = this.fair.deriveSeed(record.serverSeed, record.clientSeed, record.nonce);
    const roundId = `${record.sessionId}:${record.nonce}`;
    const engine = new CardEngine(ruleset, seed);
    const deal = engine.dealBlackjack(roundId, bets);
    record.blackjack = { roundId, seed, bets, hits: 0 };
    await this.persist(record);
    return deal;
  }

  async blackjackHit(id: string, userId: string) {
    const record = await this.getRecord(id, userId);
    if (!record.blackjack) throw new NotFoundException('No blackjack round in progress');
    const engine = await this.rebuildBlackjack(record);
    const hit = engine.blackjackHit();
    record.blackjack.hits += 1;
    await this.persist(record);
    if (hit.busted) {
      const result = await this.finishBlackjack(record, engine);
      return { ...hit, result };
    }
    return { ...hit, result: null as CardRoundResult | null };
  }

  async blackjackStand(id: string, userId: string): Promise<CardRoundResult> {
    const record = await this.getRecord(id, userId);
    if (!record.blackjack) throw new NotFoundException('No blackjack round in progress');
    const engine = await this.rebuildBlackjack(record);
    return this.finishBlackjack(record, engine);
  }

  private async rebuildBlackjack(record: CardSessionRecord): Promise<CardEngine> {
    const ruleset = await this.variants.resolve(record.variantKey);
    const bj = record.blackjack!;
    const engine = new CardEngine(ruleset, bj.seed);
    engine.dealBlackjack(bj.roundId, bj.bets);
    for (let i = 0; i < bj.hits; i += 1) engine.blackjackHit();
    return engine;
  }

  private async finishBlackjack(
    record: CardSessionRecord,
    engine: CardEngine,
  ): Promise<CardRoundResult> {
    const result = engine.blackjackResolve();
    const usedNonce = record.nonce;
    const seed = record.blackjack!.seed;
    record.blackjack = null;
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
        pluginKey: 'card-engine',
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
        pluginKey: 'card-engine',
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
      select: { id: true, roundId: true, outcome: true, betAmount: true, winAmount: true, createdAt: true },
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
    return { ended: true as const, fairness: { serverSeed: record.serverSeed, clientSeed: record.clientSeed, finalNonce: record.nonce } };
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

  private async getRecord(id: string, userId: string): Promise<CardSessionRecord> {
    const record = await this.redis.get<CardSessionRecord>(KEY(id));
    if (!record) throw new NotFoundException('Card session not found or expired');
    if (record.userId !== userId) throw new ForbiddenException('Not your card session');
    return record;
  }

  private persist(record: CardSessionRecord): Promise<void> {
    return this.redis.set(KEY(record.sessionId), record, TTL);
  }

  private requirePersisted(record: CardSessionRecord): string {
    if (!record.gameSessionId) {
      throw new NotFoundException('This session is not persisted (no game/currency bound)');
    }
    return record.gameSessionId;
  }

  private async persistResult(record: CardSessionRecord, result: CardRoundResult): Promise<void> {
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
        payload: { hands: result.hands, winners: result.winners, mode: result.mode } as Prisma.InputJsonValue,
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
    // All real-money settlement flows through the Wallet Engine (reserve+commit),
    // producing immutable double-entry ledger records. No balance is touched here.
    await this.wallet.settleImmediate({
      userId: record.userId,
      currencyId: session.currencyId,
      betAmount: result.settlement.totalBet,
      winAmount: result.settlement.totalWin,
      reference: `card:${result.roundId}`,
      idempotencyKey: `card:${result.roundId}`,
    });
  }

  private withVerification(
    result: CardRoundResult,
    record: CardSessionRecord,
    nonce: number,
    seed: string,
  ): CardRoundResult {
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

  private toView(record: CardSessionRecord): CardSessionView {
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
