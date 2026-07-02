import type { GamePlugin } from './plugin';
import type { GamePluginMetadata } from './types';

/** Plugins are stored type-erased; each runtime re-applies its own state type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGamePlugin = GamePlugin<any>;

export type PluginFactory = () => AnyGamePlugin;

export interface PluginRegistration {
  metadata: GamePluginMetadata;
  factory: PluginFactory;
}

/** In-memory registry of available game plugins, keyed by plugin key. */
export class GamePluginRegistry {
  private readonly entries = new Map<string, PluginRegistration>();

  register(registration: PluginRegistration): void {
    this.entries.set(registration.metadata.key, registration);
  }

  registerPlugin(metadata: GamePluginMetadata, factory: PluginFactory): void {
    this.register({ metadata, factory });
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): PluginRegistration | undefined {
    return this.entries.get(key);
  }

  list(): GamePluginMetadata[] {
    return [...this.entries.values()].map((e) => e.metadata);
  }

  create(key: string): AnyGamePlugin {
    const entry = this.entries.get(key);
    if (!entry) throw new Error(`No plugin registered for key "${key}"`);
    return entry.factory();
  }
}

export type DynamicPluginLoader = () => Promise<PluginRegistration>;

/**
 * Resolves a plugin factory by key. Statically-registered plugins resolve
 * synchronously; unknown keys fall back to a registered dynamic loader
 * (code-split `import()`), which is registered on first use.
 */
export class GameRegistryResolver {
  constructor(
    private readonly registry: GamePluginRegistry,
    private readonly dynamicLoaders: Record<string, DynamicPluginLoader> = {},
  ) {}

  async resolve(key: string): Promise<PluginFactory> {
    if (this.registry.has(key)) {
      return this.registry.get(key)!.factory;
    }
    const loader = this.dynamicLoaders[key];
    if (!loader) {
      throw new Error(`No plugin or dynamic loader registered for key "${key}"`);
    }
    const registration = await loader();
    this.registry.register(registration);
    return registration.factory;
  }

  metadata(): GamePluginMetadata[] {
    return this.registry.list();
  }
}
