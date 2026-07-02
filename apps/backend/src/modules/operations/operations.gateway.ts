import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { wsCorsOptions } from '../../common/ws-cors';
import { verifyAccessToken } from '@gaming-platform/auth';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Server, Socket } from 'socket.io';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';

const ROOM = 'operations';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime operations transport. Authenticated operators join a single room and
 * receive periodic overview snapshots plus alert events the instant they fire.
 */
@WebSocketGateway({ namespace: '/operations', cors: wsCorsOptions })
export class OperationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly config: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  handleConnection(client: AuthedSocket): void {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = verifyAccessToken(token, {
        accessSecret: this.config.auth.accessSecret,
        refreshSecret: this.config.auth.refreshSecret,
      });
      client.data.userId = payload.sub;
      void client.join(ROOM);
      client.emit('operations:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('operations:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('operations:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  emitOverview(overview: unknown): void {
    this.server?.to(ROOM).emit('operations:overview', overview);
  }

  emitAlert(payload: unknown): void {
    this.server?.to(ROOM).emit('operations:alert', payload);
    this.logger.warn('Operations alert broadcast', { context: 'OperationsGateway' });
  }
}
