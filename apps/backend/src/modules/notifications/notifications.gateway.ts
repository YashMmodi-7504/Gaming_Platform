import { Inject } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verifyAccessToken } from '@gaming-platform/auth';
import { WS_EVENTS } from '@gaming-platform/shared';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Server, Socket } from 'socket.io';
import type { Logger } from 'winston';

import { wsCorsOptions } from '../../common/ws-cors';
import { AppConfigService } from '../../config/app-config.service';

const userRoom = (userId: string): string => `user:${userId}`;

/**
 * Real-time notification gateway. Clients authenticate with their access token
 * on the handshake and are placed into a per-user room so the platform can push
 * targeted events (notifications, wallet updates, transaction status).
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: wsCorsOptions,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace('Bearer ', '') as string | undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = verifyAccessToken(token, {
        accessSecret: this.config.auth.accessSecret,
        refreshSecret: this.config.auth.refreshSecret,
      });

      client.data.userId = payload.sub;
      void client.join(userRoom(payload.sub));
      this.logger.info(`Realtime client connected: ${payload.sub}`, {
        context: 'NotificationsGateway',
      });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.logger.info(`Realtime client disconnected: ${userId}`, {
        context: 'NotificationsGateway',
      });
    }
  }

  /**
   * Push an event to every active connection for a given user.
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  /**
   * Broadcast a notification to a user.
   */
  notify(userId: string, payload: unknown): void {
    this.emitToUser(userId, WS_EVENTS.NOTIFICATION, payload);
  }
}
