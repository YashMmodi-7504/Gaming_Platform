import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AchievementType, LeaderboardPeriod, RewardType } from '@prisma/client';
import type { MissionDefinition } from '@gaming-platform/tournament-core';
import type { TournamentFormat } from '@gaming-platform/tournament-core';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../authorization/rbac.constants';
import { TournamentService } from './services/tournament.service';
import { LeaderboardService } from './services/leaderboard.service';
import { MissionService } from './services/mission.service';
import { AchievementService } from './services/achievement.service';
import { RewardService } from './services/reward.service';
import { SeasonService } from './services/season.service';
import {
  CreateAchievementDto,
  CreateLeaderboardDto,
  CreateRewardDto,
  CreateTournamentDto,
  MissionDto,
  ReportMatchDto,
  SeasonDto,
  SubmitScoreDto,
  UpdateTournamentDto,
} from './dto/tournament.dto';

@ApiTags('Admin · Tournaments')
@ApiBearerAuth()
@Controller('admin/tournaments')
export class AdminTournamentController {
  constructor(
    private readonly tournaments: TournamentService,
    private readonly leaderboards: LeaderboardService,
    private readonly missions: MissionService,
    private readonly achievements: AchievementService,
    private readonly rewards: RewardService,
    private readonly seasons: SeasonService,
  ) {}

  @Get('statistics')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'Tournament statistics' })
  statistics() {
    return this.tournaments.statistics();
  }

  // ---- Tournament builder & lifecycle --------------------------------------

  @Post()
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create a tournament' })
  create(@Body() dto: CreateTournamentDto) {
    return this.tournaments.create({
      name: dto.name,
      format: dto.format as TournamentFormat,
      description: dto.description,
      registrationMode: dto.registrationMode as never,
      cadence: dto.cadence as never,
      capacity: dto.capacity,
      entryFee: dto.entryFee,
      currencyId: dto.currencyId,
      password: dto.password,
      invited: dto.invited,
      allowLateJoin: dto.allowLateJoin,
      prize: dto.prize as never,
      startsAt: dto.startsAt ?? null,
    });
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Edit a draft/scheduled tournament' })
  update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournaments.update(id, dto as never);
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Open registration' })
  open(@Param('id') id: string) {
    return this.tournaments.openRegistration(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Seed, generate the bracket and go live' })
  start(@Param('id') id: string) {
    return this.tournaments.start(id);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Report a match result (advances the bracket)' })
  report(@Param('id') id: string, @Body() dto: ReportMatchDto) {
    const scores = dto.scoreA !== undefined && dto.scoreB !== undefined ? { a: dto.scoreA, b: dto.scoreB } : undefined;
    return this.tournaments.reportMatch(id, dto.matchId, dto.winnerParticipantId, scores);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Complete the tournament and distribute prizes' })
  complete(@Param('id') id: string) {
    return this.tournaments.complete(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Cancel a tournament (refunds entry fees)' })
  cancel(@Param('id') id: string) {
    return this.tournaments.cancel(id);
  }

  // ---- Leaderboards / missions / achievements / rewards / seasons ----------

  @Post('leaderboards')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create a leaderboard' })
  createLeaderboard(@Body() dto: CreateLeaderboardDto) {
    return this.leaderboards.create({
      name: dto.name,
      metric: dto.metric,
      period: dto.period as LeaderboardPeriod | undefined,
      gameId: dto.gameId,
    });
  }

  @Post('leaderboards/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Submit/replace a score (admin/system feed)' })
  submitScore(@Body() dto: SubmitScoreDto & { userId: string }) {
    return this.leaderboards.submit(dto.leaderboardId, dto.userId, dto.score);
  }

  @Get('missions')
  @RequirePermissions(PERMISSIONS.GAMES_READ)
  @ApiOperation({ summary: 'List mission definitions' })
  missionDefs() {
    return this.missions.definitions();
  }

  @Post('missions')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create or update a mission' })
  upsertMission(@Body() dto: MissionDto) {
    return this.missions.upsertDefinition(dto as MissionDefinition);
  }

  @Post('achievements')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create an achievement' })
  createAchievement(@Body() dto: CreateAchievementDto) {
    return this.achievements.create({
      slug: dto.slug,
      name: dto.name,
      type: dto.type as AchievementType | undefined,
      points: dto.points,
      target: dto.target,
    });
  }

  @Post('rewards')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create a reward' })
  createReward(@Body() dto: CreateRewardDto) {
    return this.rewards.createReward({
      slug: dto.slug,
      name: dto.name,
      type: dto.type as RewardType,
      value: dto.value,
      currencyCode: dto.currencyCode,
    });
  }

  @Post('rewards/grant')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Grant a reward to a user' })
  grantReward(@Body() body: { userId: string; rewardSlug: string }) {
    return this.rewards.grant(body.userId, body.rewardSlug);
  }

  @Post('seasons')
  @RequirePermissions(PERMISSIONS.GAMES_WRITE)
  @ApiOperation({ summary: 'Create or update a season' })
  upsertSeason(@Body() dto: SeasonDto) {
    return this.seasons.upsert({
      id: dto.id,
      name: dto.name,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      active: dto.active,
      rankPoints: dto.rankPoints ?? {},
    });
  }
}
