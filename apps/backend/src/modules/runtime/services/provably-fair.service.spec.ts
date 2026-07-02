import { ProvablyFairService } from './provably-fair.service';

describe('ProvablyFairService', () => {
  const service = new ProvablyFairService();

  it('creates a commit whose hash matches the server seed', () => {
    const commit = service.createCommit();
    expect(service.hash(commit.serverSeed)).toEqual(commit.serverSeedHash);
    expect(commit.nonce).toBe(0);
  });

  it('derives seeds deterministically', () => {
    const seedA = service.deriveSeed('server', 'client', 1);
    const seedB = service.deriveSeed('server', 'client', 1);
    expect(seedA).toEqual(seedB);
    expect(service.deriveSeed('server', 'client', 2)).not.toEqual(seedA);
  });

  it('verifies a correct derivation', () => {
    const commit = service.createCommit();
    const seed = service.deriveSeed(commit.serverSeed, 'client', commit.nonce);
    const result = service.verify({
      serverSeed: commit.serverSeed,
      serverSeedHash: commit.serverSeedHash,
      clientSeed: 'client',
      nonce: commit.nonce,
      expectedSeed: seed,
    });
    expect(result.hashValid).toBe(true);
    expect(result.seedValid).toBe(true);
  });

  it('rejects a tampered seed', () => {
    const commit = service.createCommit();
    const result = service.verify({
      serverSeed: commit.serverSeed,
      serverSeedHash: commit.serverSeedHash,
      clientSeed: 'client',
      nonce: commit.nonce,
      expectedSeed: 'wrong',
    });
    expect(result.seedValid).toBe(false);
  });
});
