import { GameLifecycleStatus, type GameStateSnapshot } from '../types';

export type StateSubscriber<TState> = (state: TState) => void;

/**
 * Holds the authoritative, versioned game state. Every mutation bumps the
 * version and notifies subscribers. Snapshots support save/restore and replay.
 */
export class GameStateManager<TState extends object> {
  private state: TState;
  private version = 0;
  private status: GameLifecycleStatus = GameLifecycleStatus.IDLE;
  private updatedAt = Date.now();
  private readonly initial: TState;
  private readonly subscribers = new Set<StateSubscriber<TState>>();

  constructor(initial: TState) {
    this.initial = structuredCloneSafe(initial);
    this.state = structuredCloneSafe(initial);
  }

  get(): Readonly<TState> {
    return this.state;
  }

  getVersion(): number {
    return this.version;
  }

  setStatus(status: GameLifecycleStatus): void {
    this.status = status;
  }

  set(next: TState): void {
    this.state = next;
    this.touch();
  }

  patch(partial: Partial<TState>): void {
    this.state = { ...this.state, ...partial };
    this.touch();
  }

  update(mutator: (draft: TState) => void): void {
    const draft = structuredCloneSafe(this.state);
    mutator(draft);
    this.state = draft;
    this.touch();
  }

  snapshot(): GameStateSnapshot<TState> {
    return {
      status: this.status,
      version: this.version,
      state: structuredCloneSafe(this.state),
      updatedAt: this.updatedAt,
    };
  }

  restore(snapshot: GameStateSnapshot<TState>): void {
    this.state = structuredCloneSafe(snapshot.state);
    this.version = snapshot.version;
    this.status = snapshot.status;
    this.updatedAt = snapshot.updatedAt;
    this.notify();
  }

  reset(): void {
    this.state = structuredCloneSafe(this.initial);
    this.version = 0;
    this.updatedAt = Date.now();
    this.notify();
  }

  subscribe(subscriber: StateSubscriber<TState>): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private touch(): void {
    this.version += 1;
    this.updatedAt = Date.now();
    this.notify();
  }

  private notify(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.state);
      } catch {
        // ignore subscriber failures
      }
    }
  }
}

/** structuredClone with a JSON fallback for older runtimes. */
export function structuredCloneSafe<T>(value: T): T {
  const cloner = (globalThis as { structuredClone?: <V>(v: V) => V }).structuredClone;
  if (typeof cloner === 'function') return cloner(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
