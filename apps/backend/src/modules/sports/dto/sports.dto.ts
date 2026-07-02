import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BetSelectionRefDto {
  @ApiProperty()
  @IsString()
  matchId!: string;

  @ApiProperty()
  @IsString()
  marketId!: string;

  @ApiProperty()
  @IsString()
  selectionId!: string;
}

export class PlaceBetDto {
  @ApiProperty({ enum: ['single', 'accumulator', 'system'] })
  @IsIn(['single', 'accumulator', 'system'])
  type!: 'single' | 'accumulator' | 'system';

  @ApiProperty({ example: '10' })
  @IsString()
  stake!: string;

  @ApiPropertyOptional({ example: 'standard' })
  @IsOptional()
  @IsString()
  profile?: string;

  @ApiProperty({ type: [BetSelectionRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BetSelectionRefDto)
  selections!: BetSelectionRefDto[];
}

export class UpsertSportDto {
  @ApiProperty()
  @IsString()
  @Matches(KEY)
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsBoolean()
  hasDraw!: boolean;

  @ApiProperty()
  @IsString()
  participantNoun!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  marketTypes!: string[];
}

export class UpsertCompetitionDto {
  @ApiProperty()
  @IsString()
  @Matches(KEY)
  key!: string;

  @ApiProperty()
  @IsString()
  @Matches(KEY)
  sportKey!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  region!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tournament?: string;
}

export class UpsertMatchDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  @Matches(KEY)
  competitionKey!: string;

  @ApiProperty()
  @IsString()
  @Matches(KEY)
  sportKey!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  startTime!: string;

  @ApiProperty({ enum: ['scheduled', 'live', 'paused', 'finished', 'settled', 'cancelled'] })
  @IsIn(['scheduled', 'live', 'paused', 'finished', 'settled', 'cancelled'])
  status!: 'scheduled' | 'live' | 'paused' | 'finished' | 'settled' | 'cancelled';

  @ApiProperty({ type: [Object] })
  @IsArray()
  participants!: unknown[];

  @ApiProperty({ type: [Object] })
  @IsArray()
  markets!: unknown[];
}

export class MatchStatusDto {
  @ApiProperty({ enum: ['scheduled', 'live', 'paused', 'finished', 'settled', 'cancelled'] })
  @IsIn(['scheduled', 'live', 'paused', 'finished', 'settled', 'cancelled'])
  status!: 'scheduled' | 'live' | 'paused' | 'finished' | 'settled' | 'cancelled';
}

export class MarketStatusDto {
  @ApiProperty({ enum: ['open', 'suspended', 'closed', 'settled'] })
  @IsIn(['open', 'suspended', 'closed', 'settled'])
  status!: 'open' | 'suspended' | 'closed' | 'settled';
}

export class UpdateOddsDto {
  @ApiProperty()
  @IsString()
  marketId!: string;

  @ApiProperty()
  @IsString()
  selectionId!: string;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(1.01)
  odds!: number;
}

export class SettleMatchDto {
  @ApiProperty({ type: Object, description: 'marketId → winning selection ids' })
  @IsObject()
  winners!: Record<string, string[]>;

  @ApiPropertyOptional({ type: Object, description: 'marketId → realised line value' })
  @IsOptional()
  @IsObject()
  lines?: Record<string, number>;

  @ApiPropertyOptional({ type: [String], description: 'selection ids forced void' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voids?: string[];
}
