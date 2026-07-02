import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RecentlyPlayedService } from '../services/recently-played.service';

@ApiTags('Games · Recently Played')
@ApiBearerAuth()
@Controller('recently-played')
export class RecentlyPlayedController {
  constructor(private readonly recentlyPlayed: RecentlyPlayedService) {}

  @Get()
  @ApiOperation({ summary: 'List recently played games' })
  list(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    const n = Number.parseInt(limit ?? '12', 10);
    return this.recentlyPlayed.list(userId, Number.isFinite(n) ? n : 12);
  }

  @Post(':gameId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record that a game was played' })
  async record(@CurrentUser('id') userId: string, @Param('gameId') gameId: string) {
    await this.recentlyPlayed.record(userId, gameId);
    return { success: true as const };
  }
}
