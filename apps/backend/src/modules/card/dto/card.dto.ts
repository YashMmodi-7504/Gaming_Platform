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

export class PlaceBetDto {
  @ApiProperty({ example: 'dragon' })
  @IsString()
  key!: string;

  @ApiProperty({ example: '10' })
  @IsString()
  amount!: string;
}

export class PlayRoundDto {
  @ApiProperty({ type: [PlaceBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceBetDto)
  bets!: PlaceBetDto[];
}

export class StatelessPlayDto {
  @ApiProperty({ example: 'dragon-tiger' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiProperty({ type: [PlaceBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceBetDto)
  bets!: PlaceBetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSeed?: string;
}

export class CreateCardSessionDto {
  @ApiProperty({ example: 'teen-patti' })
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

export class SaveCardStateDto {
  @ApiProperty({ type: Object })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  version!: number;
}

export class SaveCardReplayDto {
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

export class VerifyShuffleDto {
  @ApiProperty()
  @IsString()
  seed!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  decks?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  jokersPerDeck?: number;
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

export class CreateVariantDto {
  @ApiProperty({ example: 'lightning-dragon' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key!: string;

  @ApiProperty({ example: 'Lightning Dragon' })
  @IsString()
  name!: string;

  @ApiProperty({ type: Object, description: 'Partial rule overrides (data-driven config)' })
  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
