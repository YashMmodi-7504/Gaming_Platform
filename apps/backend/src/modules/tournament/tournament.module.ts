import { Module } from '@nestjs/common';

import { AdminTournamentController } from './admin-tournament.controller';
import { TournamentController } from './tournament.controller';
import { TournamentGateway } from './tournament.gateway';
import { AchievementService } from './services/achievement.service';
import { LeaderboardService } from './services/leaderboard.service';
import { MissionService } from './services/mission.service';
import { RewardService } from './services/reward.service';
import { SeasonService } from './services/season.service';
import { TournamentService } from './services/tournament.service';

/**
 * Enterprise Tournament, Competition, Leaderboard & Rewards platform. Tournament
 * and mission/season definitions are configuration; the pure tournament-core
 * engine drives brackets, prizes and progression. Entry fees and prize payouts
 * flow through the Wallet Engine; updates broadcast over Socket.IO.
 */
@Module({
  controllers: [TournamentController, AdminTournamentController],
  providers: [
    TournamentService,
    LeaderboardService,
    RewardService,
    MissionService,
    AchievementService,
    SeasonService,
    TournamentGateway,
  ],
  exports: [TournamentService, LeaderboardService, MissionService, AchievementService, RewardService, SeasonService],
})
export class TournamentModule {}
