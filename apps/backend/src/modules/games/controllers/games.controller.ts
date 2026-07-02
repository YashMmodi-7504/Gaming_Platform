import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ReqMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestMeta } from '../../../common/security/request-meta';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { CatalogService } from '../services/catalog.service';
import { LauncherService } from '../services/launcher.service';
import { RatingService } from '../services/rating.service';
import { RecommendationService } from '../services/recommendation.service';
import type { CatalogFilter } from '../repository/game.repository';
import { QueryGamesDto } from '../dto/query-games.dto';

@ApiTags('Games · Catalog')
@Controller('games')
export class GamesController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly recommendations: RecommendationService,
    private readonly launcher: LauncherService,
    private readonly ratings: RatingService,
  ) {}

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured games shelf' })
  featured(@Query('limit') limit?: string) {
    return this.recommendations.featured(this.toLimit(limit));
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Trending games shelf' })
  trending(@Query('limit') limit?: string) {
    return this.recommendations.trending(this.toLimit(limit));
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Popular games shelf' })
  popular(@Query('limit') limit?: string) {
    return this.recommendations.popular(this.toLimit(limit));
  }

  @Public()
  @Get('recently-added')
  @ApiOperation({ summary: 'Recently added games shelf' })
  recentlyAdded(@Query('limit') limit?: string) {
    return this.recommendations.recentlyAdded(this.toLimit(limit));
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Personalized recommendations for the current user' })
  recommended(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.recommendations.recommended(userId, this.toLimit(limit));
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse the catalog (search, filter, sort, paginate)' })
  list(@Query() query: QueryGamesDto, @ReqMeta() meta: RequestMeta) {
    return this.catalog.list({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter: this.toFilter(query, meta),
    });
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Game detail by slug' })
  detail(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }

  @Public()
  @Get(':slug/related')
  @ApiOperation({ summary: 'Related games' })
  related(@Param('slug') slug: string) {
    return this.catalog.related(slug);
  }

  @Public()
  @Get(':slug/launch')
  @ApiOperation({ summary: 'Resolve launch info & availability (registry-driven)' })
  launch(@Param('slug') slug: string, @ReqMeta() meta: RequestMeta, @Query('device') device?: string) {
    return this.launcher.resolve(slug, { countryCode: meta.countryCode, device });
  }

  @Public()
  @Get(':slug/reviews')
  @ApiOperation({ summary: 'Published reviews for a game' })
  async reviews(@Param('slug') slug: string, @Query() query: PaginationQueryDto) {
    const game = await this.catalog.getBySlug(slug);
    return this.ratings.listReviews(game.id, query.page, query.limit);
  }

  private toLimit(limit?: string): number {
    const n = Number.parseInt(limit ?? '12', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 12;
  }

  private toFilter(query: QueryGamesDto, meta: RequestMeta): CatalogFilter {
    return {
      search: query.search,
      categorySlug: query.category,
      providerCode: query.provider,
      tag: query.tag,
      device: query.device,
      language: query.language,
      currency: query.currency,
      countryCode: query.country ?? meta.countryCode ?? undefined,
      ageRating: query.ageRating,
      isNew: query.isNew,
      isFeatured: query.isFeatured,
      isTrending: query.isTrending,
      minRtp: query.minRtp ? Number.parseFloat(query.minRtp) : undefined,
    };
  }
}
