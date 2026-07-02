'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { clientConfig } from '@/lib/config';
import {
  runtimeApi,
  type RuntimeSessionView,
  type RuntimeStateSnapshot,
} from '@/lib/runtime-api';
import { useAuthStore } from '@/stores/auth-store';

export type RuntimeStatus =
  | 'idle'
  | 'unauthenticated'
  | 'creating'
  | 'connecting'
  | 'ready'
  | 'reconnecting'
  | 'error';

export interface RuntimeEventEntry {
  type: string;
  payload: unknown;
  ts: number;
}

export interface UseRuntimeResult {
  status: RuntimeStatus;
  session: RuntimeSessionView | null;
  snapshot: RuntimeStateSnapshot | null;
  lastEvent: RuntimeEventEntry | null;
  events: RuntimeEventEntry[];
  latency: number | null;
  error: string | null;
  sendAction: (type: string, payload?: Record<string, unknown>) => void;
}

/**
 * Creates a server-authoritative runtime session, connects over WebSocket,
 * streams runtime events, monitors latency via heartbeats, and reconnects
 * automatically.
 */
export function useRuntime(pluginKey: string, gameId?: string): UseRuntimeResult {
  const token = useAuthStore((s) => s.accessToken);
  const initialized = useAuthStore((s) => s.initialized);

  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [session, setSession] = useState<RuntimeSessionView | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeStateSnapshot | null>(null);
  const [events, setEvents] = useState<RuntimeEventEntry[]>([]);
  const [lastEvent, setLastEvent] = useState<RuntimeEventEntry | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const boot = async () => {
      try {
        setStatus('creating');
        const created = await runtimeApi.createSession({ pluginKey, gameId, mode: 'demo' });
        if (cancelled) return;
        setSession(created);
        sessionIdRef.current = created.runtimeSessionId;

        setStatus('connecting');
        const socket = io(`${clientConfig.wsUrl}/runtime`, {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 10,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('runtime:join', { runtimeSessionId: created.runtimeSessionId });
        });
        socket.on('runtime:state', (data: { state: RuntimeStateSnapshot }) => {
          if (cancelled) return;
          setSnapshot(data.state);
          setStatus('ready');
        });
        socket.on('runtime:event', (event: RuntimeEventEntry) => {
          if (cancelled) return;
          setLastEvent(event);
          setEvents((prev) => [event, ...prev].slice(0, 50));
        });
        socket.on('runtime:heartbeat:ack', (data: { clientTs: number }) => {
          setLatency(Date.now() - data.clientTs);
        });
        socket.on('disconnect', () => {
          if (!cancelled) setStatus('reconnecting');
        });
        socket.io.on('reconnect', () => {
          socket.emit('runtime:join', { runtimeSessionId: created.runtimeSessionId });
        });
        socket.on('connect_error', (err: Error) => {
          if (cancelled) return;
          setError(err.message);
          setStatus('error');
        });

        heartbeat = setInterval(() => {
          socket.emit('runtime:heartbeat', { ts: Date.now() });
        }, 5000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to start runtime');
        setStatus('error');
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      const id = sessionIdRef.current;
      if (id) void runtimeApi.endSession(id).catch(() => undefined);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [pluginKey, gameId, token, initialized]);

  const sendAction = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const id = sessionIdRef.current;
    const socket = socketRef.current;
    if (id && socket?.connected) {
      socket.emit('runtime:action', { runtimeSessionId: id, type, payload });
    }
  }, []);

  return { status, session, snapshot, lastEvent, events, latency, error, sendAction };
}
