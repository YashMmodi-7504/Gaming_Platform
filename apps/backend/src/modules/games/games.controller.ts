import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { QueryGamesDto } from './dto/query-games.dto';
import { GamesService } from './games.service';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List the game catalog (paginated, filterable)' })
  list(@Query() query: QueryGamesDto) {
    return this.gamesService.list(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Fetch a single game by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.gamesService.findBySlug(slug);
  }
}
