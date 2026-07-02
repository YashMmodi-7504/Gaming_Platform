import { Injectable, NotImplementedException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  grossGamingRevenue: string;
  period: { from: string; to: string };
}

/**
 * Aggregated platform analytics. Metrics are computed from the ledger and user
 * tables once the data model is introduced.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  getDashboardMetrics(_from?: string, _to?: string): Promise<DashboardMetrics> {
    throw new NotImplementedException('Analytics aggregation is pending the platform data model');
  }
}
