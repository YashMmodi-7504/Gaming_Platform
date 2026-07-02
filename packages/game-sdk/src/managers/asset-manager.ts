import type { AssetDescriptor, AssetLoader, LoadedAsset } from '../types';

export interface AssetProgress {
  loaded: number;
  total: number;
  bytesLoaded: number;
  bytesTotal: number;
  ratio: number;
}

/** Default loader — resolves metadata only; the browser harness injects a real DOM loader. */
const passthroughLoader: AssetLoader = (descriptor) =>
  Promise.resolve({ id: descriptor.id, url: descriptor.url });

/**
 * Registers and preloads a game's assets, reporting weighted progress. Loaded
 * assets are cached; background loading and cancellation are supported.
 */
export class GameAssetManager {
  private readonly descriptors = new Map<string, AssetDescriptor>();
  private readonly loaded = new Map<string, LoadedAsset>();
  private cancelled = false;

  constructor(private readonly loader: AssetLoader = passthroughLoader) {}

  register(descriptors: AssetDescriptor[]): void {
    for (const descriptor of descriptors) {
      this.descriptors.set(descriptor.id, descriptor);
    }
  }

  has(id: string): boolean {
    return this.loaded.has(id);
  }

  get<T = unknown>(id: string): T | undefined {
    return this.loaded.get(id)?.data as T | undefined;
  }

  progress(): AssetProgress {
    const total = this.descriptors.size;
    const loaded = this.loaded.size;
    let bytesTotal = 0;
    let bytesLoaded = 0;
    for (const d of this.descriptors.values()) {
      const size = d.size ?? 1;
      bytesTotal += size;
      if (this.loaded.has(d.id)) bytesLoaded += size;
    }
    return {
      loaded,
      total,
      bytesLoaded,
      bytesTotal,
      ratio: total === 0 ? 1 : bytesLoaded / bytesTotal,
    };
  }

  /** Preload every registered asset, invoking `onProgress` after each. */
  async preloadAll(onProgress?: (progress: AssetProgress) => void): Promise<void> {
    this.cancelled = false;
    for (const descriptor of this.descriptors.values()) {
      if (this.cancelled) return;
      if (this.loaded.has(descriptor.id)) continue;
      const data = await this.loader(descriptor);
      if (this.cancelled) return;
      this.loaded.set(descriptor.id, {
        id: descriptor.id,
        type: descriptor.type,
        url: descriptor.url,
        data,
      });
      onProgress?.(this.progress());
    }
  }

  cancel(): void {
    this.cancelled = true;
  }

  clear(): void {
    this.descriptors.clear();
    this.loaded.clear();
  }
}
