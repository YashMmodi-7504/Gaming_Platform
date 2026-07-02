import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Notification, PaginatedResult } from '@gaming-platform/types';

import { PrismaService } from '../database/prisma.service';
import type { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { NotificationsGateway } from './notifications.gateway';

/**
 * Notification delivery. Real-time fan-out is handled by the gateway today;
 * durable storage and read-state tracking activate with the data model.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  listForUser(_userId: string, _query: PaginationQueryDto): Promise<PaginatedResult<Notification>> {
    throw new NotImplementedException('Notification storage is pending the platform data model');
  }

  markAsRead(_userId: string, _id: string): Promise<Notification> {
    throw new NotImplementedException('Notification storage is pending the platform data model');
  }

  /**
   * Push a transient real-time notification to a connected user.
   */
  pushRealtime(userId: string, payload: Record<string, unknown>): void {
    this.gateway.notify(userId, payload);
  }
}
