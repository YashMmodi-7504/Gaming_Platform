import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

export interface SystemOverview {
  environment: string;
  version: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  timestamp: string;
}

/**
 * Administrative operations. The runtime overview below is fully implemented;
 * data-backed administration (user management, moderation) activates with the
 * data model.
 */
@Injectable()
export class AdminService {
  constructor(private readonly config: AppConfigService) {}

  getSystemOverview(): SystemOverview {
    const mem = process.memoryUsage();
    const toMb = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return {
      environment: this.config.app.env,
      version: process.env.npm_package_version ?? '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rssMb: toMb(mem.rss),
        heapUsedMb: toMb(mem.heapUsed),
        heapTotalMb: toMb(mem.heapTotal),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
