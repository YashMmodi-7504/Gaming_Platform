import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateRuntimeSessionDto {
  @ApiProperty({ example: 'dice-engine', description: 'Registered plugin key' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  pluginKey!: string;

  @ApiPropertyOptional({ description: 'Game id to bind a persisted session to' })
  @IsOptional()
  @IsString()
  gameId?: string;

  @ApiPropertyOptional({ description: 'Player-supplied client seed (provably fair)' })
  @IsOptional()
  @IsString()
  clientSeed?: string;

  @ApiPropertyOptional({ enum: ['real', 'demo'], default: 'demo' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class SaveStateDto {
  @ApiProperty({ type: Object, description: 'Serializable game state snapshot' })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  version!: number;
}

export class SaveReplayDto {
  @ApiProperty()
  @IsString()
  seed!: string;

  @ApiProperty({ type: [Object], description: 'Ordered replay frames' })
  @IsArray()
  frames!: unknown[];

  @ApiProperty({ example: 45000 })
  @IsInt()
  @Min(0)
  durationMs!: number;
}

export class RuntimeActionDto {
  @ApiProperty({ example: 'dice:roll' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
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
