import type { ISODateString, Nullable, UUID } from './common';

/**
 * Game catalog contracts shared between the API and the web client. These are
 * decoupled from the Prisma models so the registry can evolve freely.
 */

export interface GameSummary {
  id: UUID;
  slug: string;
  name: string;
  thumbnailUrl: Nullable<string>;
  bannerUrl: Nullable<string>;
  category: Nullable<{ slug: string; name: string }>;
  provider: Nullable<{ code: string; name: string }>;
  tags: string[];
  ageRating: string;
  status: string;
  visibility: string;
  isNew: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  maintenanceMode: boolean;
  ratingAverage: number;
  ratingCount: number;
  popularityScore: number;
  rtp: Nullable<number>;
}

export interface GameLaunchInfo {
  type: Nullable<string>;
  launcherKey: Nullable<string>;
  url: Nullable<string>;
  deepLink: Nullable<string>;
  routePath: Nullable<string>;
}

export interface GameDetail extends GameSummary {
  description: Nullable<string>;
  volatility: Nullable<string>;
  minBet: string;
  maxBet: string;
  supportedDevices: string[];
  supportedLanguages: string[];
  supportedCurrencies: string[];
  seo: { title: Nullable<string>; description: Nullable<string>; keywords: string[] };
  launch: GameLaunchInfo;
  releaseNotes: Nullable<string>;
  releaseDate: Nullable<ISODateString>;
  assets: Array<{ type: string; url: string; locale: Nullable<string> }>;
  versions: Array<{
    version: string;
    isCurrent: boolean;
    changelog: Nullable<string>;
    releasedAt: Nullable<ISODateString>;
  }>;
}

export interface GameCategoryNode {
  id: UUID;
  slug: string;
  name: string;
  description: Nullable<string>;
  iconUrl: Nullable<string>;
  displayOrder: number;
  gameCount: number;
  children: GameCategoryNode[];
}

export interface GameProviderSummary {
  id: UUID;
  code: string;
  name: string;
  logoUrl: Nullable<string>;
  status: string;
  gameCount: number;
}

export interface GameCollectionSummary {
  id: UUID;
  slug: string;
  name: string;
  description: Nullable<string>;
  coverUrl: Nullable<string>;
  type: string;
  isFeatured: boolean;
  gameCount: number;
}

export interface GameLaunchResolution {
  gameId: UUID;
  slug: string;
  available: boolean;
  reason: Nullable<string>;
  launch: GameLaunchInfo;
}

export interface GameReviewSummary {
  id: UUID;
  rating: Nullable<number>;
  title: Nullable<string>;
  body: string;
  helpfulCount: number;
  author: Nullable<string>;
  createdAt: ISODateString;
}

export type GameSortOption =
  | 'popular'
  | 'trending'
  | 'newest'
  | 'rating'
  | 'name'
  | 'display';
