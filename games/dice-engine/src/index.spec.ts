import { describe, expect, it } from 'vitest';
import { GameRuntime, type GameContext } from '@gaming-platform/game-sdk';

import { DicePlugin, ProvablyFairDiceRoller, type DiceEngineState } from './index';

const context: GameContext = {
  sessionId: 's1',
  gameId: 'dice-engine',
  userId: 'u1',
  mode: 'demo',
  locale: 'en',
  seed: 'dice-seed',
  metadata: {},
};

describe('dice-engine plugin', () => {
  it('rolls deterministically for a seed', () => {
    const a = ProvablyFairDiceRoller.values('x', 3, 6);
    const b = ProvablyFairDiceRoller.values('x', 3, 6);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    a.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    });
  });

  it('settles a roll through the runtime', async () => {
    const runtime = new GameRuntime<DiceEngineState>(new DicePlugin(), context);
    await runtime.initialize();
    await runtime.start();
    runtime.send('dice:roll', { bets: [{ type: 'big', amount: '1' }] });

    const state = runtime.state.get();
    expect(state.lastTotal).not.toBeNull();
    expect(state.round).toBe(1);
    expect(state.lastResult).not.toBeNull();
    expect(runtime.results.last()).toBeDefined();
  });
});
