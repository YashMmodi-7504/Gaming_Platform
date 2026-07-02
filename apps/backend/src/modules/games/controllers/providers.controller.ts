import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { ReqMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/security/request-meta';
import { CatalogService } from '../services/catalog.service';
import { ProviderService } from '../services/provider.service';
import { QueryGamesDto } from '../dto/query-games.dto';

@ApiTags('Games · Providers')
@Controller('game-providers')
export class ProvidersController {
  constructor(
    private readonly providers: ProviderService,
    private readonly catalog: CatalogService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active providers with game counts' })
  list() {
    return this.providers.list();
  }

  @Public()
  @Get(':code')
  @ApiOperation({ summary: 'Provider detail by code' })
  detail(@Param('code') code: string) {
    return this.providers.getByCode(code);
  }

  @Public()
  @Get(':code/games')
  @ApiOperation({ summary: 'Games from a provider (paginated, filterable)' })
  games(@Param('code') code: string, @Query() query: QueryGamesDto, @ReqMeta() meta: RequestMeta) {
    return this.catalog.list({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter: {
        providerCode: code,
        search: query.search,
        categorySlug: query.category,
        countryCode: meta.countryCode ?? undefined,
      },
    });
  }
}
