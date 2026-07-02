import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { ReqMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/security/request-meta';
import { CatalogService } from '../services/catalog.service';
import { CategoryService } from '../services/category.service';
import { QueryGamesDto } from '../dto/query-games.dto';

@ApiTags('Games · Categories')
@Controller('game-categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoryService,
    private readonly catalog: CatalogService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Full nested category tree with game counts' })
  tree() {
    return this.categories.tree();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Category detail by slug' })
  detail(@Param('slug') slug: string) {
    return this.categories.getBySlug(slug);
  }

  @Public()
  @Get(':slug/games')
  @ApiOperation({ summary: 'Games in a category (paginated, filterable)' })
  games(@Param('slug') slug: string, @Query() query: QueryGamesDto, @ReqMeta() meta: RequestMeta) {
    return this.catalog.list({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter: {
        categorySlug: slug,
        search: query.search,
        providerCode: query.provider,
        tag: query.tag,
        countryCode: meta.countryCode ?? undefined,
      },
    });
  }
}
