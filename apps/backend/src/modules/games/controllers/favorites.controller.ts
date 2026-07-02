import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { FavoritesService } from '../services/favorites.service';

@ApiTags('Games · Favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List favorite games (paginated)' })
  list(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.favorites.list(userId, query.page, query.limit);
  }

  @Get('ids')
  @ApiOperation({ summary: 'List favorited game ids' })
  ids(@CurrentUser('id') userId: string) {
    return this.favorites.ids(userId);
  }

  @Post(':gameId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle a game as favorite' })
  toggle(@CurrentUser('id') userId: string, @Param('gameId') gameId: string) {
    return this.favorites.toggle(userId, gameId);
  }
}
