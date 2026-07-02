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
import { CrashSessionService } from './services/crash-session.service';

const room = (sessionId: string): string => `crash:${sessionId}`;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime crash transport. Authenticated players join a table room and start a
 * round; the server-authoritative engine hides the crash point and schedules the
 * bust. Players cash out live; the bust or cash-out result (with provably-fair
 * data) is broadcast to the room. The crash time is never sent to clients.
 */
@WebSocketGateway({ namespace: '/crash', cors: wsCorsOptions })
export class CrashGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  /** Scheduled bust timers keyed by session id. */
  private readonly busts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly config: AppConfigService,
    private readonly sessions: CrashSessionService,
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
      client.emit('crash:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('crash:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    const userId = this.requireUser(client);
    const record = await this.sessions.getRecord(body.sessionId, userId); // ownership check
    await client.join(room(record.sessionId));
    client.emit('crash:state', await this.sessions.get(record.sessionId, userId));
  }

  @SubscribeMessage('crash:start')
  async start(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string; amount: string; autoCashout?: number },
  ): Promise<{ ok: boolean }> {
    const userId = this.requireUser(client);
    try {
      const start = await this.sessions.startRound(body.sessionId, userId, {
        amount: body.amount,
        autoCashout: body.autoCashout,
      });
      this.server.to(room(body.sessionId)).emit('crash:started', start);

      // Schedule the bust server-side; the crash time is never disclosed.
      const crashTimeMs = (await this.sessions.activeCrashTimeMs(body.sessionId, userId)) ?? 0;
      this.clearBust(body.sessionId);
      this.busts.set(
        body.sessionId,
        setTimeout(() => void this.fireBust(body.sessionId, userId), Math.max(0, crashTimeMs)),
      );
      return { ok: true };
    } catch (error) {
      client.emit('crash:error', { message: (error as Error).message });
      return { ok: false };
    }
  }

  @SubscribeMessage('crash:cashout')
  async cashout(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<{ ok: boolean }> {
    const userId = this.requireUser(client);
    try {
      const result = await this.sessions.cashout(body.sessionId, userId);
      this.clearBust(body.sessionId);
      this.server.to(room(body.sessionId)).emit('crash:result', result);
      return { ok: true };
    } catch (error) {
      client.emit('crash:error', { message: (error as Error).message });
      return { ok: false };
    }
  }

  @SubscribeMessage('crash:leave')
  async leave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<void> {
    await client.leave(room(body.sessionId));
  }

  @SubscribeMessage('crash:heartbeat')
  heartbeat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { ts: number }): void {
    client.emit('crash:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  private async fireBust(sessionId: string, userId: string): Promise<void> {
    this.busts.delete(sessionId);
    try {
      const result = await this.sessions.resolve(sessionId, userId);
      this.server.to(room(sessionId)).emit('crash:result', result);
    } catch (error) {
      // The round may already have been cashed out — that's expected.
      this.logger.debug('Crash bust resolve skipped', {
        context: 'CrashGateway',
        sessionId,
        reason: (error as Error).message,
      });
    }
  }

  private clearBust(sessionId: string): void {
    const handle = this.busts.get(sessionId);
    if (handle) {
      clearTimeout(handle);
      this.busts.delete(sessionId);
    }
  }

  private requireUser(client: AuthedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      throw new Error('Unauthenticated crash socket');
    }
    return userId;
  }
}
