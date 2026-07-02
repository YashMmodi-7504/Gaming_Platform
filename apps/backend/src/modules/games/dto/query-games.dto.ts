import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import type { GameSortOption } from '@gaming-platform/types';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const SORTS: GameSortOption[] = ['popular', 'trending', 'newest', 'rating', 'name', 'display'];

const toBool = ({ value }: { value: unknown }): boolean | undefined =>
  value === undefined ? undefined : value === 'true' || value === true;

export class QueryGamesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Provider code' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Tag slug' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Device platform (web, ios, android, …)' })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ description: 'Language code' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'ISO country code for geo filtering' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Age rating' })
  @IsOptional()
  @IsString()
  ageRating?: string;

  @ApiPropertyOptional({ description: 'Minimum RTP' })
  @IsOptional()
  @IsNumberString()
  minRtp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  isNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  isTrending?: boolean;

  @ApiPropertyOptional({ enum: SORTS, default: 'popular' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: GameSortOption;
}
