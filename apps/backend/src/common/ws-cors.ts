/**
 * Socket.IO CORS options derived from the `CORS_ORIGINS` environment variable —
 * the same allow-list the HTTP layer uses. When the variable is unset (local
 * development) all origins are allowed, preserving prior behaviour; in production
 * (with `CORS_ORIGINS` configured) cross-origin WebSocket connections are
 * restricted to the trusted origins.
 */
function parseWsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return true;
  const list = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length > 0 ? list : true;
}

export const wsCorsOptions = {
  origin: parseWsOrigins(),
  credentials: true,
} as const;
