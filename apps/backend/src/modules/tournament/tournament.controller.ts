import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaderboardPeriod } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { TournamentService } from './services/tournament.service';
import { LeaderboardService } from './services/leaderboard.service';
import { MissionService } from './services/mission.service';
import { AchievementService } from './services/achievement.service';
import { RewardService } from './services/reward.service';
import { SeasonService } from './services/season.service';
import { ClaimRewardDto, RegisterTournamentDto } from './dto/tournament.dto';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournaments: TournamentService,
    private readonly leaderboards: LeaderboardService,
    private readonly missions: MissionService,
    private readonly achievements: AchievementService,
    private readonly rewards: RewardService,
    private readonly seasons: SeasonService,
  ) {}

  // ---- Tournaments ---------------------------------------------------------

  @Public()
  @Get()
  @ApiOperation({ summary: 'List tournaments' })
  list(@Query('status') status?: string) {
    return this.tournaments.list({ status });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Tournament detail (bracket, participants, standings)' })
  detail(@Param('id') id: string) {
    return this.tournaments.detail(id);
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for a tournament (collects entry fee via wallet)' })
  register(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: RegisterTournamentDto) {
    return this.tournaments.register(id, userId, userId.slice(0, 8), dto.password);
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in for a tournament' })
  checkIn(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tournaments.checkIn(id, userId);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw from a tournament' })
  withdraw(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tournaments.withdraw(id, userId);
  }

  // ---- Leaderboards --------------------------------------------------------

  @Public()
  @Get('leaderboards/list')
  @ApiOperation({ summary: 'List active leaderboards' })
  leaderboardList(@Query('period') period?: LeaderboardPeriod) {
    return this.leaderboards.list(period);
  }

  @Public()
  @Get('leaderboards/:id/top')
  @ApiOperation({ summary: 'Top entries for a leaderboard' })
  leaderboardTop(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.leaderboards.top(id, limit ? Number(limit) : 100);
  }

  // ---- Missions / achievements / rewards / seasons -------------------------

  @Get('me/missions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My missions, XP and level' })
  myMissions(@CurrentUser('id') userId: string) {
    return this.missions.forUser(userId);
  }

  @Get('me/achievements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My achievements' })
  myAchievements(@CurrentUser('id') userId: string) {
    return this.achievements.forUser(userId);
  }

  @Get('me/rewards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My reward claims' })
  myRewards(@CurrentUser('id') userId: string) {
    return this.rewards.myClaims(userId);
  }

  @Post('me/rewards/:claimId/claim')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a pending reward' })
  claimReward(@CurrentUser('id') userId: string, @Param('claimId') claimId: string, @Body() dto: ClaimRewardDto) {
    return this.rewards.claim(userId, claimId, dto.currencyId);
  }

  @Public()
  @Get('rewards/catalog')
  @ApiOperation({ summary: 'Reward catalog' })
  rewardCatalog() {
    return this.rewards.listCatalog();
  }

  @Public()
  @Get('seasons/list')
  @ApiOperation({ summary: 'List seasons' })
  seasonList() {
    return this.seasons.list();
  }

  @Public()
  @Get('seasons/current')
  @ApiOperation({ summary: 'Current season' })
  currentSeason() {
    return this.seasons.current();
  }
}
