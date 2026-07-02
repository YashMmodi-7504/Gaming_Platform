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

const userRoom = (userId: string): string => `wallet:user:${userId}`;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime wallet transport. Each authenticated user joins a private room and
 * receives balance updates, transaction events and settlement notifications the
 * instant the engine commits them.
 */
@WebSocketGateway({ namespace: '/wallet', cors: wsCorsOptions })
export class WalletGateway implements OnGatewayConnection {
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
      void client.join(userRoom(payload.sub));
      client.emit('wallet:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('wallet:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('wallet:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  /** Push the user's latest balances. */
  emitBalances(userId: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit('wallet:balances', payload);
  }

  /** Push a single transaction event. */
  emitTransaction(userId: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit('wallet:transaction', payload);
  }

  /** Push a settlement event (game round committed). */
  emitSettlement(userId: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit('wallet:settlement', payload);
    this.logger.debug('Wallet settlement broadcast', { context: 'WalletGateway', userId });
  }
}
