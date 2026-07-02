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
import type { DiceBet } from '@gaming-platform/dice-engine';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Server, Socket } from 'socket.io';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';
import { DiceSessionService } from './services/dice-session.service';

const room = (sessionId: string): string => `dice:${sessionId}`;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime dice transport. Authenticated players join a table room, place bets
 * and roll via the server-authoritative engine, and the settled result
 * (including provably-fair data) is broadcast to every client in the room.
 */
@WebSocketGateway({ namespace: '/dice', cors: wsCorsOptions })
export class DiceGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly config: AppConfigService,
    private readonly sessions: DiceSessionService,
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
      client.emit('dice:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('dice:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    const userId = this.requireUser(client);
    const record = await this.sessions.getRecord(body.sessionId, userId); // ownership check
    await client.join(room(record.sessionId));
    client.emit('dice:state', await this.sessions.get(record.sessionId, userId));
  }

  @SubscribeMessage('dice:roll')
  async roll(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string; bets: DiceBet[] },
  ): Promise<{ ok: boolean }> {
    const userId = this.requireUser(client);
    try {
      const result = await this.sessions.roll(body.sessionId, userId, body.bets);
      this.server.to(room(body.sessionId)).emit('dice:result', result);
      return { ok: true };
    } catch (error) {
      client.emit('dice:error', { message: (error as Error).message });
      return { ok: false };
    }
  }

  @SubscribeMessage('dice:leave')
  async leave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    await client.leave(room(body.sessionId));
  }

  @SubscribeMessage('dice:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('dice:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  private requireUser(client: AuthedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      throw new Error('Unauthenticated dice socket');
    }
    return userId;
  }
}
