import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  AgeRating,
  GameAssetType,
  GameLauncherType,
  GameStatus,
  GameVisibility,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateGameDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty()
  @IsUUID()
  providerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  launcherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ enum: GameStatus })
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @ApiPropertyOptional({ enum: GameVisibility })
  @IsOptional()
  @IsEnum(GameVisibility)
  visibility?: GameVisibility;

  @ApiPropertyOptional({ enum: AgeRating })
  @IsOptional()
  @IsEnum(AgeRating)
  ageRating?: AgeRating;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  bannerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minBet?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxBet?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rtp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  volatility?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedDevices?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCurrencies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoAllow?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoBlock?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  launchUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deepLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseNotes?: string;
}

export class UpdateGameDto extends PartialType(CreateGameDto) {}

export class SetStatusDto {
  @ApiProperty({ enum: GameStatus })
  @IsEnum(GameStatus)
  status!: GameStatus;
}

export class SetVisibilityDto {
  @ApiProperty({ enum: GameVisibility })
  @IsEnum(GameVisibility)
  visibility!: GameVisibility;
}

export class SetFlagsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}

export class SetTrendingDto {
  @ApiProperty()
  @IsBoolean()
  isTrending!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  trendingScore?: number;
}

export class SetMaintenanceDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

export class ScheduleDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  publishedAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  availableFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  availableUntil?: string;
}

class ReorderItem {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  displayOrder!: number;
}

export class ReorderDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  items!: ReorderItem[];
}

export class AddVersionDto {
  @ApiProperty({ example: '1.2.0' })
  @IsString()
  version!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProviderDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetCollectionGamesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  gameIds!: string[];
}

export class CreateAssetDto {
  @ApiProperty({ enum: GameAssetType })
  @IsEnum(GameAssetType)
  type!: GameAssetType;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class CreateLauncherDto {
  @ApiProperty({ example: 'slots-iframe' })
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: GameLauncherType })
  @IsOptional()
  @IsEnum(GameLauncherType)
  type?: GameLauncherType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLauncherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: GameLauncherType })
  @IsOptional()
  @IsEnum(GameLauncherType)
  type?: GameLauncherType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
