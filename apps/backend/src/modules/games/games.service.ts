import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Game, PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../database/prisma.service';
import type { QueryGamesDto } from './dto/query-games.dto';

/**
 * Game catalog access. Persistence is pending the data model — method
 * contracts are final so the API surface and frontend can be built against
 * them today.
 */
@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  list(_query: QueryGamesDto): Promise<PaginatedResult<Game>> {
    throw new NotImplementedException('Game catalog is pending the platform data model');
  }

  findBySlug(_slug: string): Promise<Game | null> {
    throw new NotImplementedException('Game catalog is pending the platform data model');
  }
}
