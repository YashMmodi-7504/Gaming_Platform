import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'node:crypto';

export interface ProvablyFairCommit {
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
}

/**
 * Provably-fair seeding. The server commits to a hashed server seed up-front;
 * combined with the client seed and a nonce it deterministically derives the
 * seed string consumed by the SDK's `SeededRng`. Players can later verify any
 * outcome by re-deriving the seed from the revealed server seed.
 */
@Injectable()
export class ProvablyFairService {
  createCommit(): ProvablyFairCommit {
    const serverSeed = randomBytes(32).toString('hex');
    return { serverSeed, serverSeedHash: this.hash(serverSeed), nonce: 0 };
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Derive the deterministic RNG seed for a given round. */
  deriveSeed(serverSeed: string, clientSeed: string, nonce: number): string {
    return createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest('hex');
  }

  verify(input: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    expectedSeed: string;
  }): { hashValid: boolean; seedValid: boolean } {
    const hashValid = this.hash(input.serverSeed) === input.serverSeedHash;
    const seedValid =
      this.deriveSeed(input.serverSeed, input.clientSeed, input.nonce) === input.expectedSeed;
    return { hashValid, seedValid };
  }
}
