import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CrashBetDto {
  @ApiProperty({ example: '10' })
  @IsString()
  amount!: string;

  @ApiPropertyOptional({ example: 2.0, description: 'Auto cash-out multiplier' })
  @IsOptional()
  @IsNumber()
  autoCashout?: number;
}

export class StartRoundDto {
  @ApiProperty({ example: '10' })
  @IsString()
  amount!: string;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber()
  autoCashout?: number;
}

export class StatelessPlayDto {
  @ApiProperty({ example: 'crash' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  variantKey!: string;

  @ApiProperty({ type: [CrashBetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrashBetDto)
  bets!: CrashBetDto[];

  @ApiPropertyOptional({ type: [Number], description: 'Manual cash-out per bet (null to ride to bust)' })
  @IsOptional()
  @IsArray()
  manualCashouts?: Array<number | null>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSeed?: string;
}

export class CreateCrashSessionDto {
  @ApiProperty({ example: 'crash' })
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

export class SaveCrashStateDto {
  @ApiProperty({ type: Object })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  version!: number;
}

export class SaveCrashReplayDto {
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

export class VerifyCrashDto {
  @ApiProperty({ example: 'crash' })
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

export class CreateCrashVariantDto {
  @ApiProperty({ example: 'mega-crash' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key!: string;

  @ApiProperty({ example: 'Mega Crash' })
  @IsString()
  name!: string;

  @ApiProperty({ type: Object, description: 'Partial rule overrides (data-driven config)' })
  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateCrashVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
