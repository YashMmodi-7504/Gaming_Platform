import { Module } from '@nestjs/common';

import { ProvablyFairService } from '../runtime/services/provably-fair.service';
import { AdminCrashController } from './admin-crash.controller';
import { CrashController } from './crash.controller';
import { CrashGateway } from './crash.gateway';
import { CrashEngineService } from './services/crash-engine.service';
import { CrashSessionService } from './services/crash-session.service';
import { CrashVariantService } from './services/crash-variant.service';

/**
 * Crash Engine module. A single, data-driven engine powers every multiplier game
 * through configurable rule sets; new tables are added by configuration (variant
 * presets or admin-defined variants) — never by new backend code.
 */
@Module({
  controllers: [CrashController, AdminCrashController],
  providers: [
    CrashVariantService,
    CrashEngineService,
    CrashSessionService,
    CrashGateway,
    ProvablyFairService,
  ],
  exports: [CrashVariantService, CrashEngineService, CrashSessionService],
})
export class CrashModule {}
