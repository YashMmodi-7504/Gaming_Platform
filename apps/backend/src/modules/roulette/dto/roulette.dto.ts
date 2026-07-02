import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlaceRouletteBetDto {
  @ApiProperty({ example: 'straight', description: 'Bet type key from the ruleset' })
  @IsString()
  type!: string;

  @ApiProperty({ example: '10' })
  @IsString()
  amount!: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Covered numbers (inside bets) or single group index (dozen/column)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  selection?: number[];
}

export class SpinDto {
  @ApiProperty({ type: [PlaceRouletteBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceRouletteBetDto)
  bets!: PlaceRouletteBetDto[];
}

export class StatelessSpinDto {
  @ApiProperty({ example: 'european' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiProperty({ type: [PlaceRouletteBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceRouletteBetDto)
  bets!: PlaceRouletteBetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSeed?: string;
}

export class CreateRouletteSessionDto {
  @ApiProperty({ example: 'european' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSeed?: string;

  @ApiPropertyOptional({ enum: ['real', 'demo'], default: 'demo' })
  @IsOptional()
  @IsString()
  mode?: string;
}

export class SaveRouletteStateDto {
  @ApiProperty({ type: Object })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  version!: number;
}

export class SaveRouletteReplayDto {
  @ApiProperty()
  @IsString()
  seed!: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  frames!: unknown[];

  @ApiProperty()
  @IsInt()
  @Min(0)
  durationMs!: number;
}

export class VerifySpinDto {
  @ApiProperty({ example: 'european' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiProperty()
  @IsString()
  seed!: string;
}

export class VerifyFairnessDto {
  @ApiProperty()
  @IsString()
  serverSeed!: string;

  @ApiProperty()
  @IsString()
  serverSeedHash!: string;

  @ApiProperty()
  @IsString()
  clientSeed!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  nonce!: number;

  @ApiProperty()
  @IsString()
  expectedSeed!: string;
}

export class CreateRouletteVariantDto {
  @ApiProperty({ example: 'lightning-european' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key!: string;

  @ApiProperty({ example: 'Lightning European' })
  @IsString()
  name!: string;

  @ApiProperty({ type: Object, description: 'Partial rule overrides (data-driven config)' })
  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateRouletteVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
