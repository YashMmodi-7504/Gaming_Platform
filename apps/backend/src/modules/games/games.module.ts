import { Module } from '@nestjs/common';

import {
  AdminCategoriesController,
  AdminCollectionsController,
  AdminLaunchersController,
  AdminProvidersController,
} from './controllers/admin-catalog.controller';
import { AdminGamesController } from './controllers/admin-games.controller';
import { CategoriesController } from './controllers/categories.controller';
import { CollectionsController } from './controllers/collections.controller';
import { FavoritesController } from './controllers/favorites.controller';
import { GamesController } from './controllers/games.controller';
import { ProvidersController } from './controllers/providers.controller';
import { RatingsController } from './controllers/ratings.controller';
import { RecentlyPlayedController } from './controllers/recently-played.controller';
import { GameRepository } from './repository/game.repository';
import { AssetService } from './services/asset.service';
import { CatalogService } from './services/catalog.service';
import { CategoryService } from './services/category.service';
import { CollectionService } from './services/collection.service';
import { FavoritesService } from './services/favorites.service';
import { GameAdminService } from './services/game-admin.service';
import { GameCacheService } from './services/game-cache.service';
import { LauncherService } from './services/launcher.service';
import { ProviderService } from './services/provider.service';
import { RatingService } from './services/rating.service';
import { RecentlyPlayedService } from './services/recently-played.service';
import { RecommendationService } from './services/recommendation.service';

/**
 * Game Registry & Catalog Engine. Entirely data-driven: games, categories,
 * providers, collections, and launchers are all metadata. Adding a new game
 * requires no platform code change.
 */
@Module({
  controllers: [
    // Public
    GamesController,
    CategoriesController,
    ProvidersController,
    CollectionsController,
    FavoritesController,
    RecentlyPlayedController,
    RatingsController,
    // Admin
    AdminGamesController,
    AdminCategoriesController,
    AdminProvidersController,
    AdminCollectionsController,
    AdminLaunchersController,
  ],
  providers: [
    GameRepository,
    GameCacheService,
    CatalogService,
    CategoryService,
    ProviderService,
    CollectionService,
    RecommendationService,
    FavoritesService,
    RecentlyPlayedService,
    RatingService,
    LauncherService,
    AssetService,
    GameAdminService,
  ],
  exports: [CatalogService, LauncherService, RecentlyPlayedService],
})
export class GamesModule {}
