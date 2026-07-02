import { describe, expect, it } from 'vitest';

import { BaseGamePlugin } from './plugin';
import { GameRuntime } from './runtime';
import { GameLifecycleStatus, GameGenre, type GameContext, type GamePluginMetadata } from './types';
import { GameConfigResolver } from './managers/config-resolver';

interface CounterState {
  count: number;
}

class CounterPlugin extends BaseGamePlugin<{ step: number }, CounterState> {
  readonly metadata: GamePluginMetadata = {
    key: 'counter',
    name: 'Counter',
    genre: GameGenre.CUSTOM,
    version: '1.0.0',
    minPlayers: 1,
    maxPlayers: 1,
    capabilities: [],
    defaultConfig: { step: 1 },
  };

  createInitialState(): CounterState {
    return { count: 0 };
  }

  protected onEvent(event: { type: string }): void {
    if (event.type === 'increment') {
      this.host.state.update((draft) => {
        draft.count += (this.config.step as number) ?? 1;
      });
      this.host.statistics.increment('increments');
    }
  }
}

const context: GameContext = {
  sessionId: 'sess-1',
  gameId: 'counter',
  userId: 'user-1',
  mode: 'demo',
  locale: 'en',
  seed: 'deterministic-seed',
  metadata: {},
};

describe('GameRuntime', () => {
  it('drives the full lifecycle to READY then RUNNING', async () => {
    const runtime = new GameRuntime<CounterState>(new CounterPlugin(), context);
    expect(runtime.status()).toBe(GameLifecycleStatus.IDLE);
    await runtime.initialize();
    expect(runtime.status()).toBe(GameLifecycleStatus.READY);
    await runtime.start();
    expect(runtime.status()).toBe(GameLifecycleStatus.RUNNING);
  });

  it('applies actions to authoritative state', async () => {
    const runtime = new GameRuntime<CounterState>(new CounterPlugin(), context, {
      configOverride: { step: 5 },
    });
    await runtime.initialize();
    await runtime.start();
    runtime.send('increment');
    runtime.send('increment');
    expect(runtime.state.get().count).toBe(10);
    expect(runtime.statistics.getCounter('increments')).toBe(2);
  });

  it('save/restore round-trips state', async () => {
    const runtime = new GameRuntime<CounterState>(new CounterPlugin(), context);
    await runtime.initialize();
    await runtime.start();
    runtime.send('increment');
    const snapshot = runtime.saveState();

    const restored = new GameRuntime<CounterState>(new CounterPlugin(), context);
    await restored.initialize();
    restored.restoreState(snapshot);
    expect(restored.state.get().count).toBe(1);
  });

  it('pause and resume toggle status', async () => {
    const runtime = new GameRuntime<CounterState>(new CounterPlugin(), context);
    await runtime.initialize();
    await runtime.start();
    runtime.pause();
    expect(runtime.status()).toBe(GameLifecycleStatus.PAUSED);
    runtime.resume();
    expect(runtime.status()).toBe(GameLifecycleStatus.RUNNING);
  });

  it('config resolver merges overrides', () => {
    const resolver = new GameConfigResolver({ a: 1, nested: { x: 1, y: 2 } });
    expect(resolver.resolve({ nested: { y: 9 } })).toEqual({ a: 1, nested: { x: 1, y: 9 } });
  });
});
