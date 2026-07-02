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

const room = (id: string): string => `tournament:${id}`;
const FEED = 'tournament:feed';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime tournament transport. Clients subscribe to a global feed and to
 * individual tournament rooms to receive bracket, leaderboard, prize and status
 * updates the moment they happen.
 */
@WebSocketGateway({ namespace: '/tournament', cors: wsCorsOptions })
export class TournamentGateway implements OnGatewayConnection {
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
      if (token) {
        const payload = verifyAccessToken(token, {
          accessSecret: this.config.auth.accessSecret,
          refreshSecret: this.config.auth.refreshSecret,
        });
        client.data.userId = payload.sub;
      }
      void client.join(FEED);
      client.emit('tournament:connected', { userId: client.data.userId ?? null });
    } catch {
      void client.join(FEED);
    }
  }

  @SubscribeMessage('tournament:watch')
  async watch(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { id: string }): Promise<void> {
    await client.join(room(body.id));
  }

  @SubscribeMessage('tournament:unwatch')
  async unwatch(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { id: string }): Promise<void> {
    await client.leave(room(body.id));
  }

  emitTournament(id: string, payload: unknown): void {
    this.server?.to(room(id)).emit('tournament:update', payload);
    this.server?.to(FEED).emit('tournament:feed', { id, ...(payload as object) });
    this.logger.debug('Tournament broadcast', { context: 'TournamentGateway', id });
  }

  emitBracket(id: string, bracket: unknown): void {
    this.server?.to(room(id)).emit('tournament:bracket', { id, bracket });
  }

  emitLeaderboard(leaderboardId: string, entries: unknown): void {
    this.server?.to(FEED).emit('tournament:leaderboard', { leaderboardId, entries });
  }
}
