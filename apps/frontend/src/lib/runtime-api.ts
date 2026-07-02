import { apiClient, unwrap } from './api-client';

export interface PluginMetadata {
  key: string;
  name: string;
  genre: string;
  version: string;
  minPlayers: number;
  maxPlayers: number;
  capabilities: string[];
  defaultConfig: Record<string, unknown>;
}

export interface RuntimeSessionView {
  runtimeSessionId: string;
  sessionId: string | null;
  gameId: string | null;
  pluginKey: string;
  mode: string;
  status: string;
  config: Record<string, unknown>;
  fairness: { serverSeedHash: string; clientSeed: string; nonce: number };
}

export interface RuntimeStateSnapshot {
  status: string;
  version: number;
  state: Record<string, unknown>;
  updatedAt: number;
}

export const runtimeApi = {
  plugins: () => unwrap<PluginMetadata[]>(apiClient.get('/runtime/plugins')),
  plugin: (key: string) => unwrap<PluginMetadata>(apiClient.get(`/runtime/plugins/${key}`)),
  health: () =>
    unwrap<{ status: string; plugins: number; activeRuntimes: number }>(
      apiClient.get('/runtime/health'),
    ),

  createSession: (data: { pluginKey: string; gameId?: string; mode?: string; clientSeed?: string }) =>
    unwrap<RuntimeSessionView>(apiClient.post('/runtime/sessions', data)),

  getSession: (id: string) => unwrap<RuntimeSessionView>(apiClient.get(`/runtime/sessions/${id}`)),

  action: (id: string, type: string, payload?: Record<string, unknown>) =>
    unwrap<{ state: RuntimeStateSnapshot; lastResult: unknown }>(
      apiClient.post(`/runtime/sessions/${id}/action`, { type, payload }),
    ),

  liveState: (id: string) =>
    unwrap<{ active: boolean; state: RuntimeStateSnapshot | null }>(
      apiClient.get(`/runtime/sessions/${id}/live-state`),
    ),

  saveState: (id: string, state: Record<string, unknown>, version: number) =>
    unwrap<{ saved: true; version: number }>(
      apiClient.post(`/runtime/sessions/${id}/state`, { state, version }),
    ),

  endSession: (id: string) =>
    unwrap<{ ended: true }>(apiClient.post(`/runtime/sessions/${id}/end`, {})),
};
