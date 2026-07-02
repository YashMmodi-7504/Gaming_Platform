import type { GamePlugin } from './plugin';
import type { GameRegistryResolver } from './registry';
import { GameRuntime, type RuntimeDrivers } from './runtime';
import type { GameContext } from './types';

/**
 * High-level entry point: resolves a plugin by key (statically or via a
 * code-split dynamic import), constructs a {@link GameRuntime} around it, and
 * hands back a ready-to-initialize runtime.
 */
export class GameLoader {
  constructor(
    private readonly resolver: GameRegistryResolver,
    private readonly defaultDrivers: RuntimeDrivers = {},
  ) {}

  async load<TState extends object = object>(
    key: string,
    context: GameContext,
    drivers: RuntimeDrivers = {},
  ): Promise<GameRuntime<TState>> {
    const factory = await this.resolver.resolve(key);
    const plugin = factory() as GamePlugin<TState>;
    return new GameRuntime<TState>(plugin, context, { ...this.defaultDrivers, ...drivers });
  }

  /** Resolve and fully initialize a runtime (ends in the READY state). */
  async loadAndInitialize<TState extends object = object>(
    key: string,
    context: GameContext,
    drivers: RuntimeDrivers = {},
  ): Promise<GameRuntime<TState>> {
    const runtime = await this.load<TState>(key, context, drivers);
    await runtime.initialize();
    return runtime;
  }
}
