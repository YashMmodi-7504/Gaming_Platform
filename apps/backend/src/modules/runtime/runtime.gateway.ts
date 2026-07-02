import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
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
import { ActiveRuntimeService } from './services/active-runtime.service';
import { RuntimeSessionService } from './services/runtime-session.service';

const room = (runtimeSessionId: string): string => `runtime:${runtimeSessionId}`;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Realtime runtime transport. Authenticated players join a runtime room, send
 * actions to the server-authoritative engine, and receive its event stream.
 * Includes heartbeat/latency monitoring and seamless reconnect (re-joining a
 * live runtime resends the current state).
 */
@WebSocketGateway({ namespace: '/runtime', cors: wsCorsOptions })
export class RuntimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  /** Runtime sessions that already have a room broadcaster attached. */
  private readonly broadcasting = new Set<string>();

  constructor(
    private readonly config: AppConfigService,
    private readonly sessions: RuntimeSessionService,
    private readonly active: ActiveRuntimeService,
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
      client.emit('runtime:connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    // Keep the runtime alive for reconnect; idle runtimes are swept separately.
    if (client.data.userId) {
      this.logger.debug('Runtime client disconnected', {
        context: 'RuntimeGateway',
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage('runtime:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { runtimeSessionId: string },
  ): Promise<void> {
    const userId = this.requireUser(client);
    const record = await this.sessions.getRecord(body.runtimeSessionId, userId);

    await this.active.start({
      runtimeSessionId: record.runtimeSessionId,
      pluginKey: record.pluginKey,
      context: this.sessions.buildContext(record),
      config: record.config,
      onEvent: () => undefined,
    });

    if (!this.broadcasting.has(record.runtimeSessionId)) {
      this.active.attachListener(record.runtimeSessionId, (event) =>
        this.server.to(room(record.runtimeSessionId)).emit('runtime:event', event),
      );
      this.broadcasting.add(record.runtimeSessionId);
    }

    await client.join(room(record.runtimeSessionId));
    client.emit('runtime:state', {
      runtimeSessionId: record.runtimeSessionId,
      state: this.active.get(record.runtimeSessionId).saveState(),
    });
  }

  @SubscribeMessage('runtime:action')
  async action(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { runtimeSessionId: string; type: string; payload?: Record<string, unknown> },
  ): Promise<{ ok: boolean }> {
    const userId = this.requireUser(client);
    await this.sessions.getRecord(body.runtimeSessionId, userId); // ownership + existence
    this.active.send(body.runtimeSessionId, body.type, body.payload ?? {});
    return { ok: true };
  }

  @SubscribeMessage('runtime:leave')
  async leave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { runtimeSessionId: string },
  ): Promise<void> {
    await client.leave(room(body.runtimeSessionId));
  }

  @SubscribeMessage('runtime:heartbeat')
  heartbeat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { ts: number },
  ): void {
    client.emit('runtime:heartbeat:ack', { clientTs: body?.ts ?? 0, serverTs: Date.now() });
  }

  private requireUser(client: AuthedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      throw new Error('Unauthenticated runtime socket');
    }
    return userId;
  }
}
