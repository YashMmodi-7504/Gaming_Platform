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

export class PlaceDiceBetDto {
  @ApiProperty({ example: 'big', description: 'Bet type key from the ruleset' })
  @IsString()
  type!: string;

  @ApiProperty({ example: '10' })
  @IsString()
  amount!: string;
}

export class RollDto {
  @ApiProperty({ type: [PlaceDiceBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceDiceBetDto)
  bets!: PlaceDiceBetDto[];
}

export class StatelessRollDto {
  @ApiProperty({ example: 'sic-bo' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiProperty({ type: [PlaceDiceBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceDiceBetDto)
  bets!: PlaceDiceBetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSeed?: string;
}

export class CreateDiceSessionDto {
  @ApiProperty({ example: 'sic-bo' })
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

export class SaveDiceStateDto {
  @ApiProperty({ type: Object })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  version!: number;
}

export class SaveDiceReplayDto {
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

export class VerifyRollDto {
  @ApiProperty({ example: 'sic-bo' })
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

export class CreateDiceVariantDto {
  @ApiProperty({ example: 'super-sic-bo' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key!: string;

  @ApiProperty({ example: 'Super Sic Bo' })
  @IsString()
  name!: string;

  @ApiProperty({ type: Object, description: 'Partial rule overrides (data-driven config)' })
  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateDiceVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
