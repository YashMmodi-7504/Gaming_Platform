import { Module } from '@nestjs/common';

import { ProvablyFairService } from '../runtime/services/provably-fair.service';
import { AdminCardController } from './admin-card.controller';
import { CardController } from './card.controller';
import { CardEngineService } from './services/card-engine.service';
import { CardSessionService } from './services/card-session.service';
import { CardVariantService } from './services/card-variant.service';

/**
 * Card Engine module. A single, data-driven engine powers every supported card
 * game through configurable rule sets; new games are added by configuration
 * (variant presets or admin-defined variants) — never by new backend code.
 */
@Module({
  controllers: [CardController, AdminCardController],
  providers: [CardVariantService, CardEngineService, CardSessionService, ProvablyFairService],
  exports: [CardVariantService, CardEngineService, CardSessionService],
})
export class CardModule {}
