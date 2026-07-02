import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { CollectionService } from '../services/collection.service';

@ApiTags('Games · Collections')
@Controller('game-collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active collections' })
  list(@Query('featured') featured?: string) {
    return this.collections.list(featured === 'true');
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Collection detail with its games' })
  detail(@Param('slug') slug: string, @Query() query: PaginationQueryDto) {
    return this.collections.getBySlug(slug, query.page, query.limit);
  }
}
