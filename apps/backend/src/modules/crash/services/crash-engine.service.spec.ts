import { VariantResolver } from '@gaming-platform/crash-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { CrashEngineService } from './crash-engine.service';
import type { CrashVariantService } from './crash-variant.service';

const variantsStub = {
  resolve: (key: string) => Promise.resolve(new VariantResolver().resolve(key)),
} as unknown as CrashVariantService;

describe('CrashEngineService', () => {
  const fair = new ProvablyFairService();
  const service = new CrashEngineService(variantsStub, fair);

  it('plays a deterministic, verifiable round', async () => {
    const { result, fairness } = await service.play(
      'crash',
      [{ amount: '10', autoCashout: 2 }],
      undefined,
    );
    expect(result.variant).toBe('crash');
    expect(result.mode).toBe('crash');
    expect(result.crashPoint).toBeGreaterThanOrEqual(1);

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

  it('reproduces the same crash point for a seed', async () => {
    const a = await service.verifyCrash('crash', 'seed-7');
    const b = await service.verifyCrash('crash', 'seed-7');
    expect(a.crashPoint).toBe(b.crashPoint);
    expect(a.crashPoint).toBeGreaterThanOrEqual(1);
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
