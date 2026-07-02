import type { GameEvent } from '../types';

export type EventHandler<TPayload = unknown> = (event: GameEvent<TPayload>) => void;
export type AnyEventHandler = (event: GameEvent) => void;

/**
 * Typed, in-memory publish/subscribe bus shared by every manager and plugin.
 * Handlers are isolated: a throwing handler never breaks delivery to others.
 */
export class GameEventBus {
  private readonly handlers = new Map<string, Set<AnyEventHandler>>();
  private readonly anyHandlers = new Set<AnyEventHandler>();

  on<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as AnyEventHandler);
    this.handlers.set(type, set);
    return () => this.off(type, handler);
  }

  once<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void {
    const wrapper: EventHandler<TPayload> = (event) => {
      this.off(type, wrapper);
      handler(event);
    };
    return this.on(type, wrapper);
  }

  off<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): void {
    this.handlers.get(type)?.delete(handler as AnyEventHandler);
  }

  onAny(handler: AnyEventHandler): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  emit<TPayload = unknown>(type: string, payload: TPayload, source?: string): GameEvent<TPayload> {
    const event: GameEvent<TPayload> = { type, payload, ts: Date.now(), source };
    for (const handler of this.handlers.get(type) ?? []) {
      this.safe(handler, event);
    }
    for (const handler of this.anyHandlers) {
      this.safe(handler, event);
    }
    return event;
  }

  listenerCount(type?: string): number {
    if (type) return this.handlers.get(type)?.size ?? 0;
    let count = this.anyHandlers.size;
    for (const set of this.handlers.values()) count += set.size;
    return count;
  }

  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }

  private safe(handler: AnyEventHandler, event: GameEvent): void {
    try {
      handler(event);
    } catch {
      // Isolated: a faulty subscriber must not break event delivery.
    }
  }
}
