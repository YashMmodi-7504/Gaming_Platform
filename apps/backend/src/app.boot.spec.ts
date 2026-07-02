import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from './app.module';
import { AppService } from './app.service';

/**
 * Boot smoke test.
 *
 * Resolves the entire NestJS dependency-injection graph so that a missing,
 * duplicate, or mis-wired provider fails CI (`pnpm test`) instead of only
 * crashing the container at startup. `compile()` builds the injector and
 * instantiates every provider WITHOUT running lifecycle hooks, so no database
 * or Redis connection is made (Prisma/Redis connect in `onModuleInit`).
 */

// Provide the only two required secrets so the config validation passes in any
// environment (CI included). Real values are never overridden.
process.env.JWT_ACCESS_SECRET ??= 'ci-boot-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'ci-boot-refresh-secret-0123456789';

describe('Application bootstrap', () => {
  it('resolves the full dependency-injection graph without errors', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(AppService)).toBeInstanceOf(AppService);

    await moduleRef.close();
  });
});
