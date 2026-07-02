import { VariantResolver } from '@gaming-platform/dice-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { DiceEngineService } from './dice-engine.service';
import type { DiceVariantService } from './dice-variant.service';

const variantsStub = {
  resolve: (key: string) => Promise.resolve(new VariantResolver().resolve(key)),
} as unknown as DiceVariantService;

describe('DiceEngineService', () => {
  const fair = new ProvablyFairService();
  const service = new DiceEngineService(variantsStub, fair);

  it('rolls a deterministic, verifiable round', async () => {
    const { result, fairness } = await service.play('sic-bo', [{ type: 'big', amount: '10' }]);
    expect(result.variant).toBe('sic-bo');
    expect(result.mode).toBe('dice');
    expect(result.values).toHaveLength(3);

    // The published fairness data must verify.
    const check = service.verifyFairness({
      serverSeed: fairness.serverSeed,
      serverSeedHash: fairness.serverSeedHash,
      clientSeed: fairness.clientSeed,
      nonce: fairness.nonce,
      expectedSeed: fairness.seed,
    });
    expect(check.hashValid).toBe(true);
    expect(check.seedValid).toBe(true);
  });

  it('reproduces the same dice for a seed', async () => {
    const a = await service.verifyRoll('sic-bo', 'seed-7');
    const b = await service.verifyRoll('sic-bo', 'seed-7');
    expect(a.values).toEqual(b.values);
    expect(a.values).toHaveLength(3);
    expect(a.total).toBe(a.values.reduce((s, v) => s + v, 0));
  });

  it('rejects a tampered fairness claim', () => {
    const result = service.verifyFairness({
      serverSeed: 'a',
      serverSeedHash: fair.hash('a'),
      clientSeed: 'c',
      nonce: 0,
      expectedSeed: 'tampered',
    });
    expect(result.seedValid).toBe(false);
  });
});
