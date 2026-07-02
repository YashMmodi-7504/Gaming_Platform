import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@gaming-platform/database';
import { GameSessionStatus } from '@prisma/client';
import type { GameConfig, GameContext } from '@gaming-platform/game-sdk';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProvablyFairService } from './provably-fair.service';
import { RuntimePluginRegistryService } from './runtime-plugin-registry.service';

export interface RuntimeSessionRecord {
  runtimeSessionId: string;
  sessionId: string | null;
  userId: string;
  gameId: string | null;
  pluginKey: string;
  mode: string;
  status: string;
  seed: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  config: GameConfig;
  locale: string;
  createdAt: number;
}

export interface RuntimeSessionView {
  runtimeSessionId: string;
  sessionId: string | null;
  gameId: string | null;
  pluginKey: string;
  mode: string;
  status: string;
  config: GameConfig;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

const KEY = (id: string): string => `runtime:session:${id}`;
const TTL_SECONDS = 60 * 60;

@Injectable()
export class RuntimeSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fair: ProvablyFairService,
    private readonly registry: RuntimePluginRegistryService,
  ) {}

  async create(input: {
    userId: string;
    pluginKey: string;
    gameId?: string;
    clientSeed?: string;
    mode?: string;
    locale?: string;
  }): Promise<RuntimeSessionView> {
    this.registry.get(input.pluginKey); // throws if unknown
    const commit = this.fair.createCommit();
    const clientSeed = input.clientSeed ?? randomBytes(16).toString('hex');
    const seed = this.fair.deriveSeed(commit.serverSeed, clientSeed, commit.nonce);
    const config = this.registry.resolveConfig(input.pluginKey);
    const mode = input.mode ?? 'demo';

    const sessionId = await this.maybeCreateGameSession(input.userId, input.gameId, mode);

    const record: RuntimeSessionRecord = {
      runtimeSessionId: randomUUID(),
      sessionId,
      userId: input.userId,
      gameId: input.gameId ?? null,
      pluginKey: input.pluginKey,
      mode,
      status: 'created',
      seed,
      serverSeed: commit.serverSeed,
      serverSeedHash: commit.serverSeedHash,
      clientSeed,
      nonce: commit.nonce,
      config,
      locale: input.locale ?? 'en',
      createdAt: Date.now(),
    };

    await this.redis.set(KEY(record.runtimeSessionId), record, TTL_SECONDS);
    return this.toView(record);
  }

  async getRecord(runtimeSessionId: string, userId: string): Promise<RuntimeSessionRecord> {
    const record = await this.redis.get<RuntimeSessionRecord>(KEY(runtimeSessionId));
    if (!record) throw new NotFoundException('Runtime session not found or expired');
    if (record.userId !== userId) throw new ForbiddenException('Not your runtime session');
    return record;
  }

  async get(runtimeSessionId: string, userId: string): Promise<RuntimeSessionView> {
    return this.toView(await this.getRecord(runtimeSessionId, userId));
  }

  buildContext(record: RuntimeSessionRecord): GameContext {
    return {
      sessionId: record.sessionId ?? record.runtimeSessionId,
      gameId: record.gameId ?? record.pluginKey,
      userId: record.userId,
      mode: record.mode as GameContext['mode'],
      locale: record.locale,
      seed: record.seed,
      metadata: { runtimeSessionId: record.runtimeSessionId, pluginKey: record.pluginKey },
    };
  }

  async setStatus(runtimeSessionId: string, userId: string, status: string): Promise<void> {
    const record = await this.getRecord(runtimeSessionId, userId);
    record.status = status;
    await this.redis.set(KEY(runtimeSessionId), record, TTL_SECONDS);
  }

  // ---- Save / restore state ------------------------------------------------

  async saveState(
    runtimeSessionId: string,
    userId: string,
    state: Record<string, unknown>,
    version: number,
  ): Promise<{ saved: true; version: number }> {
    const record = await this.getRecord(runtimeSessionId, userId);
    const sessionId = this.requirePersisted(record);
    const checksum = this.fair.hash(JSON.stringify(state));

    await this.prisma.gameRuntimeState.upsert({
      where: { sessionId },
      update: { state: state as Prisma.InputJsonValue, snapshotVersion: version, checksum },
      create: {
        sessionId,
        userId,
        gameId: record.gameId ?? sessionId,
        pluginKey: record.pluginKey,
        state: state as Prisma.InputJsonValue,
        snapshotVersion: version,
        checksum,
      },
    });
    return { saved: true, version };
  }

  async getState(runtimeSessionId: string, userId: string) {
    const record = await this.getRecord(runtimeSessionId, userId);
    const sessionId = this.requirePersisted(record);
    const saved = await this.prisma.gameRuntimeState.findUnique({ where: { sessionId } });
    if (!saved) throw new NotFoundException('No saved state for this session');
    return saved;
  }

  // ---- Replay --------------------------------------------------------------

  async saveReplay(
    runtimeSessionId: string,
    userId: string,
    input: { seed: string; frames: unknown[]; durationMs: number },
  ) {
    const record = await this.getRecord(runtimeSessionId, userId);
    const sessionId = this.requirePersisted(record);
    return this.prisma.gameReplay.create({
      data: {
        sessionId,
        userId,
        gameId: record.gameId ?? sessionId,
        pluginKey: record.pluginKey,
        seed: input.seed,
        frames: input.frames as Prisma.InputJsonValue,
        frameCount: input.frames.length,
        durationMs: input.durationMs,
      },
    });
  }

  async listReplays(runtimeSessionId: string, userId: string) {
    const record = await this.getRecord(runtimeSessionId, userId);
    const sessionId = this.requirePersisted(record);
    return this.prisma.gameReplay.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, seed: true, frameCount: true, durationMs: true, createdAt: true },
    });
  }

  async end(runtimeSessionId: string, userId: string): Promise<{ ended: true }> {
    const record = await this.getRecord(runtimeSessionId, userId);
    if (record.sessionId) {
      await this.prisma.gameSession.update({
        where: { id: record.sessionId },
        data: { status: GameSessionStatus.COMPLETED, endedAt: new Date() },
      });
    }
    await this.redis.del(KEY(runtimeSessionId));
    return { ended: true };
  }

  // ---- internals -----------------------------------------------------------

  private requirePersisted(record: RuntimeSessionRecord): string {
    if (!record.sessionId) {
      throw new BadRequestException(
        'This runtime session is not persisted (no game/currency); state and replay require a persisted session',
      );
    }
    return record.sessionId;
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
      (await this.prisma.currency.findFirst({ where: { isActive: true }, select: { id: true } }))
        ?.id;
    if (!currencyId) return null;

    const session = await this.prisma.gameSession.create({
      data: { userId, gameId: game.id, currencyId, mode },
      select: { id: true },
    });
    return session.id;
  }

  private toView(record: RuntimeSessionRecord): RuntimeSessionView {
    return {
      runtimeSessionId: record.runtimeSessionId,
      sessionId: record.sessionId,
      gameId: record.gameId,
      pluginKey: record.pluginKey,
      mode: record.mode,
      status: record.status,
      config: record.config,
      fairness: {
        serverSeedHash: record.serverSeedHash,
        clientSeed: record.clientSeed,
        nonce: record.nonce,
      },
    };
  }
}
