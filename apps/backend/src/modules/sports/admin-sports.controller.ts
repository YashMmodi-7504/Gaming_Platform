import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Market, Match, Participant } from '@gaming-platform/sports-engine';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { SportsCatalogService } from './services/sports-catalog.service';
import { SportsGateway } from './sports.gateway';
import {
  MarketStatusDto,
  MatchStatusDto,
  SettleMatchDto,
  UpdateOddsDto,
  UpsertCompetitionDto,
  UpsertMatchDto,
  UpsertSportDto,
} from './dto/sports.dto';

@ApiTags('Admin · Sports Betting')
@ApiBearerAuth()
@Controller('admin/sports')
export class AdminSportsController {
  constructor(
    private readonly catalog: SportsCatalogService,
    private readonly gateway: SportsGateway,
  ) {}

  @Get('statistics')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'Sportsbook catalog statistics' })
  statistics() {
    return this.catalog.statistics();
  }

  // ---- Sports --------------------------------------------------------------

  @Get('sports')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'List all sports' })
  sports() {
    return this.catalog.listSports();
  }

  @Post('sports')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create or update a sport definition' })
  upsertSport(@Body() dto: UpsertSportDto) {
    return this.catalog.upsertSport(dto);
  }

  @Delete('sports/:key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Delete a custom sport' })
  removeSport(@Param('key') key: string) {
    return this.catalog.removeSport(key);
  }

  // ---- Competitions --------------------------------------------------------

  @Post('competitions')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create or update a competition' })
  upsertCompetition(@Body() dto: UpsertCompetitionDto) {
    return this.catalog.upsertCompetition(dto);
  }

  @Delete('competitions/:key')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Delete a competition' })
  removeCompetition(@Param('key') key: string) {
    return this.catalog.removeCompetition(key);
  }

  // ---- Matches -------------------------------------------------------------

  @Post('matches')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create or update a match (with markets and odds)' })
  async upsertMatch(@Body() dto: UpsertMatchDto) {
    const match = await this.catalog.upsertMatch({
      id: dto.id,
      competitionKey: dto.competitionKey,
      sportKey: dto.sportKey,
      name: dto.name,
      startTime: dto.startTime,
      status: dto.status,
      participants: dto.participants as Participant[],
      markets: dto.markets as Market[],
    });
    this.gateway.emitMatchUpdate(match);
    return match;
  }

  @Put('matches/:id/status')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Set match status' })
  async setMatchStatus(@Param('id') id: string, @Body() dto: MatchStatusDto) {
    const match = await this.catalog.setMatchStatus(id, dto.status);
    this.gateway.emitMatchUpdate(match);
    return match;
  }

  @Put('matches/:id/odds')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Update a selection price (live odds)' })
  async updateOdds(@Param('id') id: string, @Body() dto: UpdateOddsDto) {
    const match = await this.catalog.updateOdds(id, dto.marketId, dto.selectionId, dto.odds);
    this.gateway.emitOddsUpdate(id, dto.marketId, dto.selectionId, dto.odds);
    return match;
  }

  @Put('matches/:id/markets/:marketId/status')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Suspend / open a market' })
  async setMarketStatus(
    @Param('id') id: string,
    @Param('marketId') marketId: string,
    @Body() dto: MarketStatusDto,
  ) {
    const match = await this.catalog.setMarketStatus(id, marketId, dto.status);
    this.gateway.emitMatchUpdate(match);
    return match;
  }

  @Post('matches/:id/settle')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Settle a match with its result feed' })
  async settleMatch(@Param('id') id: string, @Body() dto: SettleMatchDto): Promise<Match> {
    const match = await this.catalog.settleMatch(id, {
      winners: dto.winners,
      lines: dto.lines ?? {},
      voids: dto.voids ?? [],
    });
    this.gateway.emitMatchUpdate(match);
    return match;
  }

  @Delete('matches/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Delete a match' })
  removeMatch(@Param('id') id: string) {
    return this.catalog.removeMatch(id);
  }
}
