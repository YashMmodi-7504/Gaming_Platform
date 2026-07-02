import {
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  GameLoader,
  type GameContext,
  type GameEvent,
  type GameConfig,
  type GameRuntime,
} from '@gaming-platform/game-sdk';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

import { RuntimePluginRegistryService } from './runtime-plugin-registry.service';

interface ActiveRuntime {
  runtime: GameRuntime;
  pluginKey: string;
  userId: string;
  lastActiveAt: number;
}

const IDLE_TTL_MS = 15 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Hosts live, server-authoritative {@link GameRuntime} instances in memory —
 * one per active runtime session. Player actions are applied here and the
 * resulting events are forwarded to the realtime gateway. Idle runtimes are
 * swept to reclaim memory.
 */
@Injectable()
export class ActiveRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly runtimes = new Map<string, ActiveRuntime>();
  private readonly loader: GameLoader;
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly registry: RuntimePluginRegistryService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.loader = new GameLoader(this.registry.resolver);
  }

  onModuleInit(): void {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    await Promise.all([...this.runtimes.keys()].map((id) => this.stop(id)));
  }

  has(runtimeSessionId: string): boolean {
    return this.runtimes.has(runtimeSessionId);
  }

  /** Create, initialize, and start a runtime; forward every event to `onEvent`. */
  async start(input: {
    runtimeSessionId: string;
    pluginKey: string;
    context: GameContext;
    config?: Partial<GameConfig>;
    onEvent: (event: GameEvent) => void;
  }): Promise<GameRuntime> {
    if (this.runtimes.has(input.runtimeSessionId)) {
      return this.runtimes.get(input.runtimeSessionId)!.runtime;
    }
    const runtime = await this.loader.load(input.pluginKey, input.context, {
      configOverride: input.config,
      logger: this.toGameLogger(),
    });
    runtime.bus.onAny(input.onEvent);
    await runtime.initialize();
    await runtime.start();

    this.runtimes.set(input.runtimeSessionId, {
      runtime,
      pluginKey: input.pluginKey,
      userId: input.context.userId ?? '',
      lastActiveAt: Date.now(),
    });
    this.logger.info('Runtime started', {
      context: 'ActiveRuntime',
      runtimeSessionId: input.runtimeSessionId,
      pluginKey: input.pluginKey,
    });
    return runtime;
  }

  get(runtimeSessionId: string): GameRuntime {
    const active = this.runtimes.get(runtimeSessionId);
    if (!active) throw new NotFoundException('Runtime is not active');
    active.lastActiveAt = Date.now();
    return active.runtime;
  }

  /** Subscribe to every event of an active runtime; returns an unsubscribe fn. */
  attachListener(runtimeSessionId: string, onEvent: (event: GameEvent) => void): () => void {
    const active = this.runtimes.get(runtimeSessionId);
    if (!active) return () => undefined;
    return active.runtime.bus.onAny(onEvent);
  }

  /** Apply a player action and return the inbound event. */
  send(runtimeSessionId: string, type: string, payload: unknown): GameEvent {
    return this.get(runtimeSessionId).send(type, payload);
  }

  async stop(runtimeSessionId: string): Promise<void> {
    const active = this.runtimes.get(runtimeSessionId);
    if (!active) return;
    this.runtimes.delete(runtimeSessionId);
    try {
      await active.runtime.destroy();
    } catch (error) {
      this.logger.warn('Runtime destroy failed', {
        context: 'ActiveRuntime',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  activeCount(): number {
    return this.runtimes.size;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, active] of this.runtimes) {
      if (now - active.lastActiveAt > IDLE_TTL_MS) {
        void this.stop(id);
      }
    }
  }

  private toGameLogger() {
    return {
      debug: (m: string, meta?: Record<string, unknown>) =>
        this.logger.debug(m, { context: 'GameRuntime', ...meta }),
      info: (m: string, meta?: Record<string, unknown>) =>
        this.logger.info(m, { context: 'GameRuntime', ...meta }),
      warn: (m: string, meta?: Record<string, unknown>) =>
        this.logger.warn(m, { context: 'GameRuntime', ...meta }),
      error: (m: string, meta?: Record<string, unknown>) =>
        this.logger.error(m, { context: 'GameRuntime', ...meta }),
    };
  }
}
