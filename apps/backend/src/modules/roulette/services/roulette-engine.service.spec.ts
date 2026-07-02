import { VariantResolver } from '@gaming-platform/roulette-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { RouletteEngineService } from './roulette-engine.service';
import type { RouletteVariantService } from './roulette-variant.service';

const variantsStub = {
  resolve: (key: string) => Promise.resolve(new VariantResolver().resolve(key)),
} as unknown as RouletteVariantService;

describe('RouletteEngineService', () => {
  const fair = new ProvablyFairService();
  const service = new RouletteEngineService(variantsStub, fair);

  it('spins a deterministic, verifiable round', async () => {
    const { result, fairness } = await service.play('european', [{ type: 'red', amount: '10' }]);
    expect(result.variant).toBe('european');
    expect(result.mode).toBe('roulette');
    expect(typeof result.pocket).toBe('number');

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

  it('reproduces the same pocket for a seed', async () => {
    const a = await service.verifySpin('american', 'seed-7');
    const b = await service.verifySpin('american', 'seed-7');
    expect(a.pocket).toBe(b.pocket);
    expect(a.sequence).toHaveLength(38);
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
