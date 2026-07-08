/** Locale-pinned date/time formatting for ledgers (client-only render). */
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
