import { Injectable } from '@nestjs/common';

import { AppConfigService } from './config/app-config.service';

export interface AppInfo {
  name: string;
  version: string;
  environment: string;
  status: 'online';
  docs: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly config: AppConfigService) {}

  getInfo(): AppInfo {
    return {
      name: this.config.app.name,
      version: process.env.npm_package_version ?? '1.0.0',
      environment: this.config.app.env,
      status: 'online',
      docs: `/${this.config.app.swaggerPath}`,
      timestamp: new Date().toISOString(),
    };
  }
}
