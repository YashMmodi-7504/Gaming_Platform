import { Module } from '@nestjs/common';

import { AdminSportsController } from './admin-sports.controller';
import { SportsController } from './sports.controller';
import { SportsGateway } from './sports.gateway';
import { SportsBettingService } from './services/sports-betting.service';
import { SportsCatalogService } from './services/sports-catalog.service';
import { SportsEngineService } from './services/sports-engine.service';

/**
 * Sports Betting module. A single, data-driven engine powers every sport and
 * market type; the catalog (sports, competitions, matches, markets, odds,
 * results) is stored as configuration so new content is added by data — never by
 * new backend code.
 */
@Module({
  controllers: [SportsController, AdminSportsController],
  providers: [SportsCatalogService, SportsBettingService, SportsEngineService, SportsGateway],
  exports: [SportsCatalogService, SportsBettingService, SportsEngineService],
})
export class SportsModule {}
