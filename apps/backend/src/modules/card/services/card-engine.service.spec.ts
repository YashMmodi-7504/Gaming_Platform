import { VariantResolver } from '@gaming-platform/card-engine';

import { ProvablyFairService } from '../../runtime/services/provably-fair.service';
import { CardEngineService } from './card-engine.service';
import type { CardVariantService } from './card-variant.service';

const variantsStub = {
  resolve: (key: string) => Promise.resolve(new VariantResolver().resolve(key)),
} as unknown as CardVariantService;

describe('CardEngineService', () => {
  const fair = new ProvablyFairService();
  const service = new CardEngineService(variantsStub, fair);

  it('plays a deterministic, verifiable round', async () => {
    const { result, fairness } = await service.play('dragon-tiger', [{ key: 'dragon', amount: '10' }]);
    expect(result.variant).toBe('dragon-tiger');
    expect(result.winners.length).toBeGreaterThan(0);

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

  it('reproduces an identical shoe for a seed', () => {
    const a = service.verifyShuffle('seed-7', 1, 0);
    const b = service.verifyShuffle('seed-7', 1, 0);
    expect(a.shuffledDeck).toEqual(b.shuffledDeck);
    expect(a.shuffledDeck).toHaveLength(52);
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
