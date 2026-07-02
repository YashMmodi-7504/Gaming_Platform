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
import type { Match } from '@gaming-platform/sports-engine';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Server, Socket } from 'socket.io';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';

const matchRoom = (matchId: string): string => `sports:match:${matchId}`;
const SPORTS_FEED = 'sports:feed';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime sportsbook transport. Clients subscribe to a global feed and to
 * individual match rooms; the server pushes live odds changes, market status and
 * settlement updates. Admin catalog mutations broadcast through {@link emitMatchUpdate}.
 */
@WebSocketGateway({ namespace: '/sports', cors: wsCorsOptions })
export class SportsGateway implements OnGatewayConnection {
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
      // The sportsbook feed is public; an invalid token simply stays anonymous.
      if (token) {
        const payload = verifyAccessToken(token, {
          accessSecret: this.config.auth.accessSecret,
          refreshSecret: this.config.auth.refreshSecret,
        });
        client.data.userId = payload.sub;
      }
      void client.join(SPORTS_FEED);
      client.emit('sports:connected', { userId: client.data.userId ?? null });
    } catch {
      void client.join(SPORTS_FEED);
      client.emit('sports:connected', { userId: null });
    }
  }

  @SubscribeMessage('sports:watch')
  async watch(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { matchId: string },
  ): Promise<void> {
    await client.join(matchRoom(body.matchId));
  }

  @SubscribeMessage('sports:unwatch')
  async unwatch(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { matchId: string },
  ): Promise<void> {
    await client.leave(matchRoom(body.matchId));
  }

  @SubscribeMessage('sports:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('sports:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  /** Broadcast a full match update to its room and the global feed. */
  emitMatchUpdate(match: Match): void {
    if (!this.server) return;
    const payload = { matchId: match.id, status: match.status, markets: match.markets };
    this.server.to(matchRoom(match.id)).emit('sports:match', payload);
    this.server.to(SPORTS_FEED).emit('sports:feed', { matchId: match.id, status: match.status });
    this.logger.debug('Sports match broadcast', { context: 'SportsGateway', matchId: match.id });
  }

  /** Broadcast a single odds change. */
  emitOddsUpdate(matchId: string, marketId: string, selectionId: string, odds: number): void {
    if (!this.server) return;
    this.server
      .to(matchRoom(matchId))
      .emit('sports:odds', { matchId, marketId, selectionId, odds });
  }
}
