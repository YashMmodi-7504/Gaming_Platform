import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SportsCatalogService } from './services/sports-catalog.service';
import { SportsBettingService } from './services/sports-betting.service';
import { SportsEngineService } from './services/sports-engine.service';
import { PlaceBetDto } from './dto/sports.dto';

@ApiTags('Sports Betting')
@Controller('sports')
export class SportsController {
  constructor(
    private readonly catalog: SportsCatalogService,
    private readonly betting: SportsBettingService,
    private readonly engine: SportsEngineService,
  ) {}

  // ---- Catalog (public) ----------------------------------------------------

  @Public()
  @Get('sports')
  @ApiOperation({ summary: 'List supported sports' })
  listSports() {
    return this.catalog.listSports();
  }

  @Public()
  @Get('market-templates')
  @ApiOperation({ summary: 'List market type templates' })
  marketTemplates() {
    return this.catalog.marketTemplates();
  }

  @Public()
  @Get('profiles')
  @ApiOperation({ summary: 'List betting rule profiles' })
  profiles() {
    return this.engine.listProfiles();
  }

  @Public()
  @Get('competitions')
  @ApiOperation({ summary: 'List competitions (optionally by sport)' })
  competitions(@Query('sportKey') sportKey?: string) {
    return this.catalog.listCompetitions(sportKey);
  }

  @Public()
  @Get('competitions/:key')
  @ApiOperation({ summary: 'Get a competition' })
  competition(@Param('key') key: string) {
    return this.catalog.getCompetition(key);
  }

  @Public()
  @Get('matches')
  @ApiOperation({ summary: 'List matches (filter by competition / sport / status)' })
  matches(
    @Query('competitionKey') competitionKey?: string,
    @Query('sportKey') sportKey?: string,
    @Query('status') status?: string,
  ) {
    return this.catalog.listMatches({ competitionKey, sportKey, status });
  }

  @Public()
  @Get('matches/live')
  @ApiOperation({ summary: 'List live matches' })
  live() {
    return this.catalog.listMatches({ status: 'live' });
  }

  @Public()
  @Get('matches/upcoming')
  @ApiOperation({ summary: 'List upcoming matches' })
  upcoming() {
    return this.catalog.listMatches({ status: 'scheduled' });
  }

  @Public()
  @Get('matches/:id')
  @ApiOperation({ summary: 'Get match details with markets and odds' })
  match(@Param('id') id: string) {
    return this.catalog.getMatch(id);
  }

  // ---- Betting (authenticated) --------------------------------------------

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Price a bet slip without placing it' })
  quote(@Body() dto: PlaceBetDto) {
    return this.betting.quote(dto);
  }

  @Post('bets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a bet slip' })
  place(@CurrentUser('id') userId: string, @Body() dto: PlaceBetDto) {
    return this.betting.place(userId, dto);
  }

  @Get('bets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my bets (settles resolved ones)' })
  bets(@CurrentUser('id') userId: string, @Query('status') status?: string) {
    return this.betting.listBets(userId, status);
  }

  @Get('bets/statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My betting statistics' })
  statistics(@CurrentUser('id') userId: string) {
    return this.betting.statistics(userId);
  }
}
