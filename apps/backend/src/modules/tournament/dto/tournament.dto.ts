import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';

const FORMATS = ['single-elimination', 'double-elimination', 'swiss', 'round-robin', 'knockout', 'timed', 'leaderboard'];

export class CreateTournamentDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: FORMATS })
  @IsString()
  format!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['open', 'invite', 'password', 'private'] })
  @IsOptional()
  @IsString()
  registrationMode?: string;

  @ApiPropertyOptional({ enum: ['one-off', 'daily', 'weekly', 'monthly', 'season'] })
  @IsOptional()
  @IsString()
  cadence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2)
  capacity?: number;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  entryFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invited?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowLateJoin?: boolean;

  @ApiPropertyOptional({ type: Object, description: 'Prize config (type, tiers, guaranteed, entryContribution)' })
  @IsOptional()
  @IsObject()
  prize?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;
}

export class UpdateTournamentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryFee?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  prize?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;
}

export class RegisterTournamentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class ReportMatchDto {
  @ApiProperty()
  @IsString()
  matchId!: string;

  @ApiProperty()
  @IsString()
  winnerParticipantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  scoreA?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  scoreB?: number;
}

export class SubmitScoreDto {
  @ApiProperty()
  @IsString()
  leaderboardId!: string;

  @ApiProperty()
  @IsInt()
  score!: number;
}

export class CreateLeaderboardDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metric?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL', 'ALL_TIME'] })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameId?: string;
}

export class MissionDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['daily', 'weekly', 'monthly', 'season', 'permanent'] })
  @IsString()
  window!: string;

  @ApiProperty()
  @IsString()
  metric!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  target!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  xp!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rewardSlugs?: string[];
}

export class CreateAchievementDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ['MILESTONE', 'PROGRESSION', 'CHALLENGE', 'SECRET', 'SEASONAL'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  target?: number;
}

export class CreateRewardDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['CASH', 'BONUS', 'FREE_SPINS', 'CASHBACK', 'POINTS', 'BADGE', 'PHYSICAL'] })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;
}

export class ClaimRewardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyId?: string;
}

export class SeasonDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  startsAt!: string;

  @ApiProperty()
  @IsString()
  endsAt!: string;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rankPoints?: Record<number, number>;
}
