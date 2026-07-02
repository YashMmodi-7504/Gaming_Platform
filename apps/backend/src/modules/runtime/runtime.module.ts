import { Module } from '@nestjs/common';

import { RuntimeController } from './runtime.controller';
import { RuntimeGateway } from './runtime.gateway';
import { ActiveRuntimeService } from './services/active-runtime.service';
import { ProvablyFairService } from './services/provably-fair.service';
import { RuntimePluginRegistryService } from './services/runtime-plugin-registry.service';
import { RuntimeSessionService } from './services/runtime-session.service';

/**
 * Enterprise Game Runtime & Plugin Engine. Registers every engine plugin,
 * hosts server-authoritative runtimes, persists save-state and replays, and
 * exposes REST + realtime (WebSocket) runtime APIs.
 */
@Module({
  controllers: [RuntimeController],
  providers: [
    RuntimePluginRegistryService,
    ProvablyFairService,
    ActiveRuntimeService,
    RuntimeSessionService,
    RuntimeGateway,
  ],
  exports: [RuntimePluginRegistryService, RuntimeSessionService, ActiveRuntimeService],
})
export class RuntimeModule {}
