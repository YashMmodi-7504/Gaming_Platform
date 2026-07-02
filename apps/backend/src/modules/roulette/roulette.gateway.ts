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
import type { RouletteBet } from '@gaming-platform/roulette-engine';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Server, Socket } from 'socket.io';
import type { Logger } from 'winston';

import { AppConfigService } from '../../config/app-config.service';
import { RouletteSessionService } from './services/roulette-session.service';

const room = (sessionId: string): string => `roulette:${sessionId}`;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime roulette transport. Authenticated players join a table room, place
 * bets and spin via the server-authoritative engine, and the settled result
 * (including provably-fair data) is broadcast to every client in the room.
 */
@WebSocketGateway({ namespace: '/roulette', cors: wsCorsOptions })
export class RouletteGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly config: AppConfigService,
    private readonly sessions: RouletteSessionService,
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
      client.emit('roulette:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('roulette:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    const userId = this.requireUser(client);
    const record = await this.sessions.getRecord(body.sessionId, userId); // ownership check
    await client.join(room(record.sessionId));
    client.emit('roulette:state', await this.sessions.get(record.sessionId, userId));
  }

  @SubscribeMessage('roulette:spin')
  async spin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string; bets: RouletteBet[] },
  ): Promise<{ ok: boolean }> {
    const userId = this.requireUser(client);
    try {
      const result = await this.sessions.spin(body.sessionId, userId, body.bets);
      this.server.to(room(body.sessionId)).emit('roulette:result', result);
      return { ok: true };
    } catch (error) {
      client.emit('roulette:error', { message: (error as Error).message });
      return { ok: false };
    }
  }

  @SubscribeMessage('roulette:leave')
  async leave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    await client.leave(room(body.sessionId));
  }

  @SubscribeMessage('roulette:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('roulette:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  private requireUser(client: AuthedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      throw new Error('Unauthenticated roulette socket');
    }
    return userId;
  }
}
