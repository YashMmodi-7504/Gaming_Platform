import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpsertAlertRuleDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'error_rate' })
  @IsString()
  metric!: string;

  @ApiProperty({ enum: ['>', '>=', '<', '<=', '=='] })
  @IsIn(['>', '>=', '<', '<=', '=='])
  comparator!: string;

  @ApiProperty()
  @IsNumber()
  threshold!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  forSeconds!: number;

  @ApiProperty({ enum: ['info', 'warning', 'critical'] })
  @IsIn(['info', 'warning', 'critical'])
  severity!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class LogQueryDto {
  @ApiPropertyOptional({ enum: ['info', 'warn', 'error'] })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
