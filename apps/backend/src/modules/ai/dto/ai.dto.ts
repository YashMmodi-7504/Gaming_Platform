import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchDto {
  @ApiProperty({ example: 'show me card games with high rtp' })
  @IsString()
  @MinLength(2)
  query!: string;
}

export class AskDto {
  @ApiProperty({ example: 'explain revenue today' })
  @IsString()
  @MinLength(2)
  question!: string;

  @ApiPropertyOptional({ description: 'Player id for player-specific questions' })
  @IsOptional()
  @IsString()
  userId?: string;
}
