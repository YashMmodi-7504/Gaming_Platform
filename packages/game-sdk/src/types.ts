/**
 * Core contracts for the Game Runtime & Plugin Engine. Everything here is
 * isomorphic (no Node- or DOM-specific APIs) so the SDK runs on the server
 * (authoritative game engines) and in the browser (runtime harness).
 */

export enum GameLifecycleStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  LOADING_CONFIG = 'LOADING_CONFIG',
  LOADING_ASSETS = 'LOADING_ASSETS',
  READY = 'READY',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  DESTROYED = 'DESTROYED',
  ERROR = 'ERROR',
}

export enum GameGenre {
  CARD = 'CARD',
  ROULETTE = 'ROULETTE',
  DICE = 'DICE',
  CRASH = 'CRASH',
  LOTTERY = 'LOTTERY',
  SPORTS = 'SPORTS',
  CUSTOM = 'CUSTOM',
}

export type GameMode = 'real' | 'demo' | 'replay';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Deterministic, replayable random source. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Boolean with probability `p` of true (default 0.5). */
  bool(p?: number): boolean;
  /** Uniformly pick an element. */
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates shuffle (returns a new array). */
  shuffle<T>(items: readonly T[]): T[];
  /** Weighted pick. */
  weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T;
}

export interface GameConfig {
  [key: string]: unknown;
}

export interface GamePluginMetadata {
  key: string;
  name: string;
  genre: GameGenre;
  version: string;
  minPlayers: number;
  maxPlayers: number;
  capabilities: string[];
  defaultConfig: GameConfig;
}

export interface GameContext {
  sessionId: string;
  gameId: string;
  userId?: string;
  mode: GameMode;
  locale: string;
  currency?: string;
  /** Deterministic seed (provably-fair material resolves to this on the server). */
  seed: string;
  metadata: Record<string, unknown>;
}

export interface GameStateSnapshot<TState = unknown> {
  status: GameLifecycleStatus;
  version: number;
  state: TState;
  updatedAt: number;
}

export interface GameEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  ts: number;
  source?: string;
}

export interface GameResultRecord {
  roundId: string;
  outcome: string;
  betAmount: string;
  winAmount: string;
  multiplier?: number;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface ReplayFrame {
  seq: number;
  ts: number;
  type: string;
  data: Record<string, unknown>;
}

export interface StatisticsSnapshot {
  counters: Record<string, number>;
  observations: Record<string, { count: number; sum: number; min: number; max: number; avg: number }>;
}

// ---- Asset / Audio / Animation driver abstractions --------------------------

export type AssetType = 'image' | 'audio' | 'video' | 'json' | 'font' | 'spritesheet';

export interface AssetDescriptor {
  id: string;
  type: AssetType;
  url: string;
  /** Bytes — used only for weighting the progress bar when known. */
  size?: number;
}

export interface LoadedAsset {
  id: string;
  type: AssetType;
  url: string;
  data: unknown;
}

/** Loads a single asset. The browser harness injects a real DOM loader. */
export type AssetLoader = (descriptor: AssetDescriptor) => Promise<unknown>;

export interface AudioDriver {
  load(id: string, url: string): Promise<void>;
  play(id: string, options?: { loop?: boolean; volume?: number }): void;
  stop(id: string): void;
  stopAll(): void;
  setMasterVolume(volume: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

/** Drives an animation loop. The browser harness injects requestAnimationFrame. */
export interface AnimationScheduler {
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

// ---- Storage ----------------------------------------------------------------

export interface StorageDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

// ---- Localization / Theme ---------------------------------------------------

export type LocaleDictionary = Record<string, string>;

export interface ThemeTokens {
  [token: string]: string | number;
}

export interface GameTheme {
  name: string;
  tokens: ThemeTokens;
}
