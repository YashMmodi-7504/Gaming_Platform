import type {
  GameConfig,
  GameContext,
  GameEvent,
  GamePluginMetadata,
  GameStateSnapshot,
  Logger,
  Rng,
} from './types';
import type { GameEventBus } from './managers/event-bus';
import type { GameStateManager } from './managers/state-manager';
import type { GameTimerManager } from './managers/timer-manager';
import type { GameStatisticsManager } from './managers/statistics-manager';
import type { GameReplayManager } from './managers/replay-manager';
import type { GameResultManager } from './managers/result-manager';
import type { GameStorageManager } from './managers/storage-manager';
import type { GameLocalization } from './managers/localization';
import type { GameThemeManager } from './managers/theme-manager';
import type { GameAssetManager, AssetProgress } from './managers/asset-manager';
import type { GameAudioManager } from './managers/audio-manager';
import type { GameAnimationManager } from './managers/animation-manager';
import type { AssetDescriptor } from './types';

/**
 * Everything a plugin is given by the runtime. A plugin never constructs its
 * own managers — it operates exclusively through this host, which keeps every
 * engine sandboxed to the services the runtime grants it.
 */
export interface PluginHost<TState extends object = object> {
  readonly context: GameContext;
  readonly config: GameConfig;
  readonly rng: Rng;
  readonly bus: GameEventBus;
  readonly state: GameStateManager<TState>;
  readonly timers: GameTimerManager;
  readonly statistics: GameStatisticsManager;
  readonly replay: GameReplayManager;
  readonly results: GameResultManager;
  readonly storage: GameStorageManager;
  readonly localization: GameLocalization;
  readonly theme: GameThemeManager;
  readonly assets: GameAssetManager;
  readonly audio: GameAudioManager;
  readonly animation: GameAnimationManager;
  readonly logger: Logger;
}

/** The common interface every game engine implements. */
export interface GamePlugin<TState extends object = object> {
  readonly metadata: GamePluginMetadata;
  createInitialState(): TState;
  attach(host: PluginHost<TState>): void;
  initialize(): Promise<void> | void;
  loadConfiguration(): Promise<void> | void;
  loadAssets(onProgress?: (p: AssetProgress) => void): Promise<void>;
  start(): Promise<void> | void;
  pause(): void;
  resume(): void;
  stop(): Promise<void> | void;
  destroy(): Promise<void> | void;
  saveState(): GameStateSnapshot<TState>;
  restoreState(snapshot: GameStateSnapshot<TState>): void;
  emitEvent(type: string, payload?: unknown): void;
  receiveEvent(event: GameEvent): void;
  recordStatistics(): void;
  cleanup(): void;
}

/**
 * Base class every engine extends. It implements the full lifecycle contract in
 * terms of overridable protected hooks, so concrete engines only write the
 * gameplay that is unique to their genre.
 */
export abstract class BaseGamePlugin<
  TConfig extends GameConfig = GameConfig,
  TState extends object = object,
> implements GamePlugin<TState>
{
  abstract readonly metadata: GamePluginMetadata;

  protected host!: PluginHost<TState>;

  /** Initial typed state for this plugin's state manager. */
  abstract createInitialState(): TState;

  attach(host: PluginHost<TState>): void {
    this.host = host;
  }

  protected get config(): TConfig {
    return this.host.config as TConfig;
  }

  protected get state(): TState {
    return this.host.state.get() as TState;
  }

  // ---- Lifecycle ----------------------------------------------------------

  async initialize(): Promise<void> {
    await this.onInitialize();
  }

  async loadConfiguration(): Promise<void> {
    await this.onConfigure();
  }

  async loadAssets(onProgress?: (p: AssetProgress) => void): Promise<void> {
    const descriptors = this.getAssetDescriptors();
    if (descriptors.length > 0) {
      this.host.assets.register(descriptors);
      await this.host.assets.preloadAll(onProgress);
    } else {
      onProgress?.(this.host.assets.progress());
    }
    await this.onAssetsLoaded();
  }

  async start(): Promise<void> {
    await this.onStart();
  }

  pause(): void {
    this.host.replay.pause();
    this.onPause();
  }

  resume(): void {
    this.host.replay.resume();
    this.onResume();
  }

  async stop(): Promise<void> {
    await this.onStop();
  }

  async destroy(): Promise<void> {
    await this.onDestroy();
    this.cleanup();
  }

  saveState(): GameStateSnapshot<TState> {
    return this.host.state.snapshot();
  }

  restoreState(snapshot: GameStateSnapshot<TState>): void {
    this.host.state.restore(snapshot);
    this.onRestore(snapshot);
  }

  emitEvent(type: string, payload: unknown = {}): void {
    this.host.bus.emit(type, payload, this.metadata.key);
    this.host.replay.record(type, { payload } as Record<string, unknown>);
  }

  receiveEvent(event: GameEvent): void {
    this.onEvent(event);
  }

  recordStatistics(): void {
    this.onRecordStatistics();
  }

  cleanup(): void {
    this.host.timers.clearAll();
    this.host.animation.stop();
    this.host.audio.stopAll();
    this.onCleanup();
  }

  // ---- Overridable hooks (no-ops by default) ------------------------------

  /** Asset descriptors the runtime should preload before the game starts. */
  protected getAssetDescriptors(): AssetDescriptor[] {
    return [];
  }

  protected onInitialize(): void | Promise<void> {}
  protected onConfigure(): void | Promise<void> {}
  protected onAssetsLoaded(): void | Promise<void> {}
  protected onStart(): void | Promise<void> {}
  protected onPause(): void {}
  protected onResume(): void {}
  protected onStop(): void | Promise<void> {}
  protected onDestroy(): void | Promise<void> {}
  protected onRestore(_snapshot: GameStateSnapshot<TState>): void {}
  protected onEvent(_event: GameEvent): void {}
  protected onRecordStatistics(): void {}
  protected onCleanup(): void {}
}
