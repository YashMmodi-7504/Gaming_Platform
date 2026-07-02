import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global database module. Provides the {@link PrismaService} singleton to the
 * entire application.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
