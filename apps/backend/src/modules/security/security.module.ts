import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service';
import { GeoService } from './geo.service';
import { SecurityEventService } from './security-event.service';

/**
 * Cross-cutting security services (geo resolution, security event log, audit
 * trail) available application-wide.
 */
@Global()
@Module({
  providers: [GeoService, SecurityEventService, AuditService],
  exports: [GeoService, SecurityEventService, AuditService],
})
export class SecurityModule {}
