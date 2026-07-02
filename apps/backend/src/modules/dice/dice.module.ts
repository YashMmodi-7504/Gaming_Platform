import { Module } from '@nestjs/common';

import { ProvablyFairService } from '../runtime/services/provably-fair.service';
import { AdminDiceController } from './admin-dice.controller';
import { DiceController } from './dice.controller';
import { DiceGateway } from './dice.gateway';
import { DiceEngineService } from './services/dice-engine.service';
import { DiceSessionService } from './services/dice-session.service';
import { DiceVariantService } from './services/dice-variant.service';

/**
 * Dice Engine module. A single, data-driven engine powers every dice game
 * through configurable rule sets; new tables are added by configuration
 * (variant presets or admin-defined variants) — never by new backend code.
 */
@Module({
  controllers: [DiceController, AdminDiceController],
  providers: [
    DiceVariantService,
    DiceEngineService,
    DiceSessionService,
    DiceGateway,
    ProvablyFairService,
  ],
  exports: [DiceVariantService, DiceEngineService, DiceSessionService],
})
export class DiceModule {}
