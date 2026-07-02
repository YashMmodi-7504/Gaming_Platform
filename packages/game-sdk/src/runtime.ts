import { GameLifecycle } from './lifecycle';
import type { GamePlugin, PluginHost } from './plugin';
import { GameEventBus } from './managers/event-bus';
import { GameStateManager } from './managers/state-manager';
import { GameTimerManager } from './managers/timer-manager';
import { GameStatisticsManager } from './managers/statistics-manager';
import { GameReplayManager } from './managers/replay-manager';
import { GameResultManager } from './managers/result-manager';
import { GameStorageManager } from './managers/storage-manager';
import { GameLocalization } from './managers/localization';
import { GameThemeManager } from './managers/theme-manager';
import { GameAssetManager, type AssetProgress } from './managers/asset-manager';
import { GameAudioManager } from './managers/audio-manager';
import { GameAnimationManager } from './managers/animation-manager';
import { SeededRng } from './rng';
import {
  type AnimationScheduler,
  type AssetLoader,
  type AudioDriver,
  type GameConfig,
  type GameContext,
  type GameEvent,
  type GameStateSnapshot,
  type GameTheme,
  type LocaleDictionary,
  GameLifecycleStatus,
  type Logger,
  type Rng,
  type StorageDriver,
} from './types';

const consoleLogger: Logger = {
  /* eslint-disable no-console */
  debug: (m, meta) => console.debug(`[game] ${m}`, meta ?? ''),
  info: (m, meta) => console.info(`[game] ${m}`, meta ?? ''),
  warn: (m, meta) => console.warn(`[game] ${m}`, meta ?? ''),
  error: (m, meta) => console.error(`[game] ${m}`, meta ?? ''),
  /* eslint-enable no-console */
};

export interface RuntimeDrivers {
  rng?: Rng;
  assetLoader?: AssetLoader;
  audioDriver?: AudioDriver;
  animationScheduler?: AnimationScheduler;
  storageDriver?: StorageDriver;
  logger?: Logger;
  locales?: Record<string, LocaleDictionary>;
  themes?: GameTheme[];
  configOverride?: Partial<GameConfig>;
}

export const RUNTIME_EVENTS = {
  ASSET_PROGRESS: 'runtime:asset-progress',
  ERROR: 'runtime:error',
  READY: 'runtime:ready',
  STARTED: 'runtime:started',
  STOPPED: 'runtime:stopped',
} as const;

/**
 * Hosts a single {@link GamePlugin}, owning every manager and driving the full
 * lifecycle. The runtime is the only thing a plugin talks to — it implements
 * {@link PluginHost}, so engines stay sandboxed to the services granted here.
 */
export class GameRuntime<TState extends object = object> implements PluginHost<TState> {
  readonly context: GameContext;
  readonly config: GameConfig;
  readonly rng: Rng;
  readonly logger: Logger;
  readonly bus = new GameEventBus();
  readonly state: GameStateManager<TState>;
  readonly timers = new GameTimerManager();
  readonly statistics = new GameStatisticsManager();
  readonly replay: GameReplayManager;
  readonly results = new GameResultManager();
  readonly storage: GameStorageManager;
  readonly localization: GameLocalization;
  readonly theme: GameThemeManager;
  readonly assets: GameAssetManager;
  readonly audio: GameAudioManager;
  readonly animation: GameAnimationManager;

  private readonly lifecycle = new GameLifecycle(this.bus);

  constructor(
    private readonly plugin: GamePlugin<TState>,
    context: GameContext,
    drivers: RuntimeDrivers = {},
  ) {
    this.context = context;
    this.logger = drivers.logger ?? consoleLogger;
    this.rng = drivers.rng ?? new SeededRng(context.seed);
    this.config = { ...plugin.metadata.defaultConfig, ...(drivers.configOverride ?? {}) };
    this.state = new GameStateManager<TState>(plugin.createInitialState());
    this.replay = new GameReplayManager(context.seed);
    this.storage = new GameStorageManager(drivers.storageDriver, `game:${context.gameId}`);
    this.localization = new GameLocalization(drivers.locales, context.locale);
    this.localization.setLocale(context.locale);
    this.theme = new GameThemeManager(drivers.themes);
    this.assets = new GameAssetManager(drivers.assetLoader);
    this.audio = new GameAudioManager(drivers.audioDriver);
    this.animation = new GameAnimationManager(drivers.animationScheduler);
  }

  status(): GameLifecycleStatus {
    return this.lifecycle.current();
  }

  /** Run initialize → loadConfiguration → loadAssets, ending in READY. */
  async initialize(): Promise<void> {
    try {
      this.lifecycle.transition(GameLifecycleStatus.INITIALIZING);
      this.plugin.attach(this);
      await this.plugin.initialize();

      this.lifecycle.transition(GameLifecycleStatus.LOADING_CONFIG);
      await this.plugin.loadConfiguration();

      this.lifecycle.transition(GameLifecycleStatus.LOADING_ASSETS);
      this.state.setStatus(GameLifecycleStatus.LOADING_ASSETS);
      await this.plugin.loadAssets((progress: AssetProgress) =>
        this.bus.emit(RUNTIME_EVENTS.ASSET_PROGRESS, progress, 'runtime'),
      );

      this.lifecycle.transition(GameLifecycleStatus.READY);
      this.state.setStatus(GameLifecycleStatus.READY);
      this.bus.emit(RUNTIME_EVENTS.READY, {}, 'runtime');
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      this.lifecycle.transition(GameLifecycleStatus.STARTING);
      await this.plugin.start();
      this.lifecycle.transition(GameLifecycleStatus.RUNNING);
      this.state.setStatus(GameLifecycleStatus.RUNNING);
      this.bus.emit(RUNTIME_EVENTS.STARTED, {}, 'runtime');
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  pause(): void {
    this.lifecycle.transition(GameLifecycleStatus.PAUSED);
    this.state.setStatus(GameLifecycleStatus.PAUSED);
    this.plugin.pause();
  }

  resume(): void {
    this.lifecycle.transition(GameLifecycleStatus.RUNNING);
    this.state.setStatus(GameLifecycleStatus.RUNNING);
    this.plugin.resume();
  }

  async stop(): Promise<void> {
    this.lifecycle.transition(GameLifecycleStatus.STOPPING);
    await this.plugin.stop();
    this.lifecycle.transition(GameLifecycleStatus.STOPPED);
    this.state.setStatus(GameLifecycleStatus.STOPPED);
    this.bus.emit(RUNTIME_EVENTS.STOPPED, {}, 'runtime');
  }

  async destroy(): Promise<void> {
    await this.plugin.destroy();
    this.lifecycle.transition(GameLifecycleStatus.DESTROYED);
    this.state.setStatus(GameLifecycleStatus.DESTROYED);
    this.bus.clear();
  }

  saveState(): GameStateSnapshot<TState> {
    return this.plugin.saveState();
  }

  restoreState(snapshot: GameStateSnapshot<TState>): void {
    this.plugin.restoreState(snapshot);
  }

  recordStatistics(): void {
    this.plugin.recordStatistics();
  }

  /** Deliver an inbound action/event to the plugin (e.g. a player action). */
  send(type: string, payload: unknown = {}): GameEvent {
    const event: GameEvent = { type, payload, ts: Date.now(), source: 'player' };
    this.plugin.receiveEvent(event);
    return event;
  }

  on<TPayload = unknown>(type: string, handler: (event: GameEvent<TPayload>) => void): () => void {
    return this.bus.on(type, handler);
  }

  getPluginMetadata() {
    return this.plugin.metadata;
  }

  private fail(error: unknown): void {
    this.state.setStatus(GameLifecycleStatus.ERROR);
    if (this.lifecycle.canTransition(GameLifecycleStatus.ERROR)) {
      this.lifecycle.transition(GameLifecycleStatus.ERROR);
    }
    this.bus.emit(
      RUNTIME_EVENTS.ERROR,
      { message: error instanceof Error ? error.message : String(error) },
      'runtime',
    );
    this.logger.error('Game runtime error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
