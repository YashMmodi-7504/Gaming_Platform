import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RecommendationService } from './services/recommendation.service';
import { SearchService } from './services/search.service';
import { SearchDto } from './dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly recommendations: RecommendationService,
    private readonly search: SearchService,
  ) {}

  // ---- Personalization -----------------------------------------------------

  @Get('for-you')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Personalized home payload (recommended, trending, continue playing)' })
  forYou(@CurrentUser('id') userId: string) {
    return this.recommendations.forYou(userId);
  }

  @Get('recommended')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommended games for the player' })
  recommended(@CurrentUser('id') userId: string) {
    return this.recommendations.recommended(userId);
  }

  @Get('recently-played')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recently played games' })
  recentlyPlayed(@CurrentUser('id') userId: string) {
    return this.recommendations.recentlyPlayed(userId);
  }

  @Get('continue-playing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Continue playing (open sessions)' })
  continuePlaying(@CurrentUser('id') userId: string) {
    return this.recommendations.continuePlaying(userId);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Trending games' })
  trending() {
    return this.recommendations.trending();
  }

  @Public()
  @Get('similar/:gameId')
  @ApiOperation({ summary: 'Games similar to a given game' })
  similar(@Param('gameId') gameId: string) {
    return this.recommendations.similarTo(gameId);
  }

  @Get('recommended-tournaments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommended tournaments' })
  recommendedTournaments() {
    return this.recommendations.recommendedTournaments();
  }

  // ---- Smart search --------------------------------------------------------

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Natural-language smart search (games / tournaments / players)' })
  smartSearch(@Body() dto: SearchDto) {
    return this.search.search(dto.query);
  }

  @Public()
  @Get('search/games')
  @ApiOperation({ summary: 'Quick catalog search' })
  catalogSearch(@Query('q') q: string) {
    return this.search.catalogSearch(q ?? '');
  }
}
