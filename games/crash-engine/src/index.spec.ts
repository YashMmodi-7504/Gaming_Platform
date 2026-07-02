import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameRuntime, type GameContext } from '@gaming-platform/game-sdk';

import { CrashPlugin, ProvablyFairCrashGenerator, VariantResolver, type CrashEngineState } from './index';

const context: GameContext = {
  sessionId: 's1',
  gameId: 'crash-engine',
  userId: 'u1',
  mode: 'demo',
  locale: 'en',
  seed: 'crash-seed',
  metadata: {},
};

describe('crash-engine plugin', () => {
  it('exposes deterministic provably-fair crash points', () => {
    const ruleset = new VariantResolver().resolve('crash');
    const a = ProvablyFairCrashGenerator.fromRuleset('s:1', ruleset);
    const b = ProvablyFairCrashGenerator.fromRuleset('s:1', ruleset);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(1);
  });

  describe('through the runtime', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('runs a round to settlement', async () => {
      const runtime = new GameRuntime<CrashEngineState>(new CrashPlugin(), context);
      await runtime.initialize();
      await runtime.start();

      runtime.send('crash:start', { amount: '10', autoCashout: 1.2 });
      // Advance fake time to (at most) the round cap to force resolution.
      await vi.advanceTimersByTimeAsync(120000);

      const state = runtime.state.get();
      expect(state.phase).toBe('crashed');
      expect(state.crashPoint).not.toBeNull();
      expect(state.lastResult).not.toBeNull();
      expect(runtime.results.last()).toBeDefined();
    });
  });
});
