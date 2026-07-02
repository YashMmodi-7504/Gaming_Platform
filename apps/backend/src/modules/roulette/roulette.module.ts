import { Module } from '@nestjs/common';

import { ProvablyFairService } from '../runtime/services/provably-fair.service';
import { AdminRouletteController } from './admin-roulette.controller';
import { RouletteController } from './roulette.controller';
import { RouletteGateway } from './roulette.gateway';
import { RouletteEngineService } from './services/roulette-engine.service';
import { RouletteSessionService } from './services/roulette-session.service';
import { RouletteVariantService } from './services/roulette-variant.service';

/**
 * Roulette Engine module. A single, data-driven engine powers every roulette
 * variant through configurable rule sets; new tables are added by configuration
 * (variant presets or admin-defined variants) — never by new backend code.
 */
@Module({
  controllers: [RouletteController, AdminRouletteController],
  providers: [
    RouletteVariantService,
    RouletteEngineService,
    RouletteSessionService,
    RouletteGateway,
    ProvablyFairService,
  ],
  exports: [RouletteVariantService, RouletteEngineService, RouletteSessionService],
})
export class RouletteModule {}
