/**
 * Natural-language search → structured intent. A deterministic, rule-based parser
 * maps phrases like "show me card games", "highest RTP games", "tournaments
 * today" or "players with suspicious activity" into a typed query the backend
 * executes against the catalog, tournaments or player data. No LLM required.
 */

export type SearchEntity = 'game' | 'tournament' | 'player';

export interface SearchIntent {
  entity: SearchEntity;
  filters: {
    category?: string;
    rtpMin?: number;
    trending?: boolean;
    isNew?: boolean;
    free?: boolean;
    today?: boolean;
    status?: string;
    suspicious?: boolean;
  };
  sort?: 'rtp' | 'popularity' | 'newest' | 'prize';
  sortDir: 'asc' | 'desc';
  keywords: string[];
  raw: string;
}

const CATEGORIES = ['card', 'roulette', 'dice', 'crash', 'slot', 'table', 'live', 'sports', 'poker', 'baccarat', 'blackjack'];

export function parseQuery(raw: string): SearchIntent {
  const text = raw.toLowerCase();
  const intent: SearchIntent = { entity: 'game', filters: {}, sortDir: 'desc', keywords: [], raw };

  // Entity.
  if (/\b(tournament|tournaments|comp|competition)\b/.test(text)) intent.entity = 'tournament';
  else if (/\b(player|players|user|users|account|accounts)\b/.test(text)) intent.entity = 'player';

  // Category (games).
  for (const cat of CATEGORIES) {
    if (new RegExp(`\\b${cat}s?\\b`).test(text)) {
      intent.filters.category = cat;
      break;
    }
  }

  // RTP.
  if (/\b(highest|best|top|high)\b.*\brtp\b|\brtp\b.*\b(highest|best|top|high)\b/.test(text)) {
    intent.sort = 'rtp';
    intent.sortDir = 'desc';
  }
  const rtpOver = text.match(/rtp\s*(?:over|above|>|of at least|greater than)\s*(\d+(?:\.\d+)?)/);
  if (rtpOver) intent.filters.rtpMin = Number(rtpOver[1]);

  // Flags.
  if (/\b(trending|popular|hot|most played)\b/.test(text)) {
    intent.filters.trending = true;
    if (!intent.sort) intent.sort = 'popularity';
  }
  if (/\b(new|latest|recent)\b/.test(text)) intent.filters.isNew = true;
  if (/\b(free|free entry|no entry)\b/.test(text)) intent.filters.free = true;
  if (/\b(today|now|live)\b/.test(text)) {
    intent.filters.today = true;
    if (/\blive\b/.test(text)) intent.filters.status = 'live';
  }
  if (/\b(suspicious|fraud|fraudulent|risky|cheating|bot)\b/.test(text)) {
    intent.entity = 'player';
    intent.filters.suspicious = true;
  }

  // Leftover keywords (strip control words).
  const consumed = new Set([
    'show', 'me', 'games', 'game', 'tournaments', 'tournament', 'players', 'player', 'with', 'activity',
    'highest', 'best', 'top', 'high', 'rtp', 'trending', 'popular', 'hot', 'new', 'latest', 'today', 'live',
    'free', 'suspicious', 'fraud', 'risky', ...CATEGORIES,
  ]);
  intent.keywords = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !consumed.has(w));

  return intent;
}
