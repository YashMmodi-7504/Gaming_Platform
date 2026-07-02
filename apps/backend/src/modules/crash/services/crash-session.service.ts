import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import { GameOutcome, GameSessionStatus } from '@prisma/client';
import {
  BetValidator,
  CrashEngine,
  MultiplierManager,
  ProvablyFairCrashGenerator,
  type CrashGameRuleSet,
  type CrashRoundResult,
} from '@gaming-platform/crash-engine';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { WalletBridgeService } from '../../wallet-engine/services/wallet-bridge.service';
import { CrashVariantService } from './crash-variant.service';

interface ActiveRound {
  roundId: string;
  seed: string;
  betAmount: string;
  autoCashout: number | null;
  crashPoint: number;
  crashTimeMs: number;
  startedAt: number;
}

interface CrashSessionRecord {
  sessionId: string;
  gameSessionId: string | null;
  userId: string;
  gameId: string | null;
  variantKey: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  mode: string;
  status: string;
  active: ActiveRound | null;
  createdAt: number;
}

export interface CrashSessionView {
  sessionId: string;
  gameSessionId: string | null;
  variantKey: string;
  mode: string;
  status: string;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface RoundStartView {
  roundId: string;
  startedAt: number;
  serverSeedHash: string;
  nonce: number;
}

const KEY = (id: string): string => `crash:session:${id}`;
const TTL = 60 * 60;

@Injectable()
export class CrashSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fair: ProvablyFairService,
    private readonly variants: CrashVariantService,
    private readonly wallet: WalletBridgeService,
  ) {}

  async create(input: {
    userId: string;
    variantKey: string;
    gameId?: string;
    clientSeed?: string;
    mode?: string;
  }): Promise<{ session: CrashSessionView; ruleset: CrashGameRuleSet }> {
    const ruleset = await this.variants.resolve(input.variantKey); // throws if unknown
    const commit = this.fair.createCommit();
    const mode = input.mode ?? 'demo';
    const gameSessionId = await this.maybeCreateGameSession(input.userId, input.gameId, mode);

    const record: CrashSessionRecord = {
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
      active: null,
      createdAt: Date.now(),
    };
    await this.persist(record);
    return { session: this.toView(record), ruleset };
  }

  async get(id: string, userId: string): Promise<CrashSessionView> {
    return this.toView(await this.getRecord(id, userId));
  }

  /**
   * Begin a round: derive the per-round seed, compute (and hide) the crash
   * point, and open the cash-out window. The crash point is never returned — it
   * is revealed only on settlement and is fully verifiable afterwards.
   */
  async startRound(
    id: string,
    userId: string,
    bet: { amount: string; autoCashout?: number },
  ): Promise<RoundStartView> {
    const record = await this.getRecord(id, userId);
    if (record.active) throw new ConflictException('A round is already in progress');
    const ruleset = await this.variants.resolve(record.variantKey);
    BetValidator.validate(ruleset, [{ amount: bet.amount, autoCashout: bet.autoCashout }]);

    const seed = this.fair.deriveSeed(record.serverSeed, record.clientSeed, record.nonce);
    const crashPoint = ProvablyFairCrashGenerator.fromRuleset(seed, ruleset);
    const crashTimeMs = Math.min(
      new MultiplierManager(ruleset).timeToReach(crashPoint),
      ruleset.roundDurationCapMs,
    );
    const active: ActiveRound = {
      roundId: `${record.sessionId}:${record.nonce}`,
      seed,
      betAmount: bet.amount,
      autoCashout: typeof bet.autoCashout === 'number' ? bet.autoCashout : null,
      crashPoint,
      crashTimeMs,
      startedAt: Date.now(),
    };
    record.active = active;
    await this.persist(record);
    // crashTimeMs is intentionally NOT returned — it would reveal the crash
    // point. It is stored on the record for the realtime gateway to schedule the
    // bust server-side; the point is disclosed only on settlement.
    return {
      roundId: active.roundId,
      startedAt: active.startedAt,
      serverSeedHash: record.serverSeedHash,
      nonce: record.nonce,
    };
  }

  /** The hidden bust deadline (ms) for the in-progress round — gateway only. */
  async activeCrashTimeMs(id: string, userId: string): Promise<number | null> {
    const record = await this.getRecord(id, userId);
    return record.active?.crashTimeMs ?? null;
  }

  /** Manually cash out at the multiplier reached by the elapsed time. */
  async cashout(id: string, userId: string): Promise<CrashRoundResult> {
    const record = await this.getRecord(id, userId);
    const active = record.active;
    if (!active) throw new NotFoundException('No round in progress');
    const ruleset = await this.variants.resolve(record.variantKey);
    const elapsed = Date.now() - active.startedAt;
    const multiplier = new MultiplierManager(ruleset).valueAt(elapsed);
    return this.settle(record, ruleset, multiplier);
  }

  /**
   * Resolve the round without a manual cash-out (bust / auto cash-out only).
   * Idempotent-by-nonce: once settled the active round is cleared.
   */
  async resolve(id: string, userId: string): Promise<CrashRoundResult> {
    const record = await this.getRecord(id, userId);
    const active = record.active;
    if (!active) throw new NotFoundException('No round in progress');
    const ruleset = await this.variants.resolve(record.variantKey);
    return this.settle(record, ruleset, null);
  }

  private async settle(
    record: CrashSessionRecord,
    ruleset: CrashGameRuleSet,
    manualCashout: number | null,
  ): Promise<CrashRoundResult> {
    const active = record.active!;
    const engine = new CrashEngine(ruleset, active.seed);
    const result = engine.playRound(
      active.roundId,
      [{ amount: active.betAmount, autoCashout: active.autoCashout ?? undefined }],
      [manualCashout],
    );

    const usedNonce = record.nonce;
    record.active = null;
    record.nonce += 1;
    await this.persist(record);
    await this.persistResult(record, result);
    return this.withVerification(result, record, usedNonce, active.seed);
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
        pluginKey: 'crash-engine',
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
        pluginKey: 'crash-engine',
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
  async getRecord(id: string, userId: string): Promise<CrashSessionRecord> {
    const record = await this.redis.get<CrashSessionRecord>(KEY(id));
    if (!record) throw new NotFoundException('Crash session not found or expired');
    if (record.userId !== userId) throw new ForbiddenException('Not your crash session');
    return record;
  }

  private persist(record: CrashSessionRecord): Promise<void> {
    return this.redis.set(KEY(record.sessionId), record, TTL);
  }

  private requirePersisted(record: CrashSessionRecord): string {
    if (!record.gameSessionId) {
      throw new NotFoundException('This session is not persisted (no game/currency bound)');
    }
    return record.gameSessionId;
  }

  private async persistResult(record: CrashSessionRecord, result: CrashRoundResult): Promise<void> {
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
          crashPoint: result.crashPoint,
          cashouts: result.cashouts,
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
      reference: `crash:${result.roundId}`,
      idempotencyKey: `crash:${result.roundId}`,
    });
  }

  private withVerification(
    result: CrashRoundResult,
    record: CrashSessionRecord,
    nonce: number,
    seed: string,
  ): CrashRoundResult {
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

  private toView(record: CrashSessionRecord): CrashSessionView {
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
