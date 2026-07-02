import type { StorageDriver } from '../types';

/** In-memory storage driver — the default, used on the server and in tests. */
export class MemoryStorageDriver implements StorageDriver {
  private readonly store = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  keys(): Promise<string[]> {
    return Promise.resolve([...this.store.keys()]);
  }
}

/**
 * Namespaced persistence for game UIs (settings, last-bet, dismissed tooltips).
 * The browser harness injects a localStorage-backed driver; the server uses the
 * in-memory default.
 */
export class GameStorageManager {
  constructor(
    private readonly driver: StorageDriver = new MemoryStorageDriver(),
    private readonly namespace = 'game',
  ) {}

  private nsKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  get(key: string): Promise<string | null> {
    return this.driver.get(this.nsKey(key));
  }

  set(key: string, value: string): Promise<void> {
    return this.driver.set(this.nsKey(key), value);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON(key: string, value: unknown): Promise<void> {
    return this.set(key, JSON.stringify(value));
  }

  remove(key: string): Promise<void> {
    return this.driver.remove(this.nsKey(key));
  }

  async keys(): Promise<string[]> {
    const prefix = `${this.namespace}:`;
    const keys = await this.driver.keys();
    return keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
  }
}
