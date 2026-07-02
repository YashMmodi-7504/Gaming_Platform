/**
 * Frontend demo dataset for the Sportsbook.
 *
 * This module is a PRESENTATION-ONLY fallback. The live API and bet-placement
 * flow are untouched — `mockMatches()` / `MOCK_SPORTS` are used by the lobby and
 * detail pages ONLY when the real query returns nothing. When the backend has
 * fixtures, the live data is always preferred.
 *
 * IMPORTANT: no `Date.now()` / `new Date()` at module top level. All time math is
 * computed inside functions from a passed-in `now` (defaulting to Date.now() at
 * call time), so the module is deterministic to import and SSR-safe.
 */
import type { Market, Match, Participant, Selection, SportDefinition } from './sports-api';

const MIN = 60_000;
const HOUR = 60 * MIN;

// ---------------------------------------------------------------------------
// Sports catalog
// ---------------------------------------------------------------------------

export const MOCK_SPORTS: SportDefinition[] = [
  { key: 'football', name: 'Football', category: 'Team', hasDraw: true, participantNoun: 'team', marketTypes: ['1x2', 'totals'] },
  { key: 'cricket', name: 'Cricket', category: 'Team', hasDraw: false, participantNoun: 'team', marketTypes: ['moneyline', 'totals'] },
  { key: 'tennis', name: 'Tennis', category: 'Individual', hasDraw: false, participantNoun: 'player', marketTypes: ['moneyline'] },
  { key: 'basketball', name: 'Basketball', category: 'Team', hasDraw: false, participantNoun: 'team', marketTypes: ['moneyline', 'totals'] },
  { key: 'kabaddi', name: 'Kabaddi', category: 'Team', hasDraw: false, participantNoun: 'team', marketTypes: ['moneyline', 'totals'] },
  { key: 'volleyball', name: 'Volleyball', category: 'Team', hasDraw: false, participantNoun: 'team', marketTypes: ['moneyline'] },
  { key: 'esports', name: 'Esports', category: 'Esports', hasDraw: false, participantNoun: 'team', marketTypes: ['moneyline', 'totals'] },
];

/** Emoji "logo" per sport — used by the lobby filter pills. */
export const SPORT_EMOJI: Record<string, string> = {
  football: '⚽',
  cricket: '🏏',
  tennis: '🎾',
  basketball: '🏀',
  kabaddi: '🤼',
  volleyball: '🏐',
  esports: '🎮',
};

/** Competition metadata (region + emoji flag) keyed by competitionKey. */
export const COMPETITION_META: Record<string, { name: string; region: string; flag: string }> = {
  'epl': { name: 'Premier League', region: 'England', flag: '🇬🇧' },
  'laliga': { name: 'La Liga', region: 'Spain', flag: '🇪🇸' },
  'ucl': { name: 'Champions League', region: 'Europe', flag: '🇪🇺' },
  'ipl': { name: 'Indian Premier League', region: 'India', flag: '🇮🇳' },
  'bbl': { name: 'Big Bash League', region: 'Australia', flag: '🇦🇺' },
  'atp': { name: 'ATP Tour', region: 'International', flag: '🌍' },
  'nba': { name: 'NBA', region: 'USA', flag: '🇺🇸' },
  'prokabaddi': { name: 'Pro Kabaddi League', region: 'India', flag: '🇮🇳' },
  'volleynations': { name: 'Volleyball Nations League', region: 'International', flag: '🌍' },
  'cs2': { name: 'CS2 Major', region: 'Global', flag: '🎮' },
  'valorant': { name: 'Valorant Champions', region: 'Global', flag: '🎮' },
  'dota2': { name: 'Dota 2 The International', region: 'Global', flag: '🎮' },
};

export function competitionMeta(key: string): { name: string; region: string; flag: string } {
  return COMPETITION_META[key] ?? { name: key, region: '', flag: '🏆' };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface TeamSeed {
  name: string;
  short: string;
}

interface FixtureSeed {
  competitionKey: string;
  sportKey: string;
  home: TeamSeed;
  away: TeamSeed;
  /** Minutes from `now`. Negative ⇒ in-play (live). Positive ⇒ scheduled. */
  offsetMin: number;
  /** Live score, e.g. [2, 1] — only used when offsetMin < 0. */
  score?: [number, number];
  /** Display clock for in-play, e.g. "67'" or "Set 2". */
  clock?: string;
  /** Base home odds — drives the 1X2 / moneyline pricing. */
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
  /** Totals line (over/under). Omit to skip the totals market. */
  totalLine?: number;
  overOdds?: number;
  underOdds?: number;
}

function sel(id: string, name: string, odds: number, extra?: Partial<Selection>): Selection {
  return { id, name, odds, status: 'open', ...extra };
}

function buildMarkets(seed: FixtureSeed, hasDraw: boolean, idBase: string): Market[] {
  const markets: Market[] = [];

  // 1X2 / moneyline
  const mainSelections: Selection[] = [sel(`${idBase}-m0-s0`, seed.home.name, seed.homeOdds, { side: 'home' })];
  if (hasDraw && seed.drawOdds != null) {
    mainSelections.push(sel(`${idBase}-m0-s1`, 'Draw', seed.drawOdds, { side: 'draw' }));
  }
  mainSelections.push(sel(`${idBase}-m0-s2`, seed.away.name, seed.awayOdds, { side: 'away' }));

  markets.push({
    id: `${idBase}-m0`,
    templateKey: hasDraw ? '1x2' : 'moneyline',
    name: hasDraw ? 'Match Result (1X2)' : 'Match Winner',
    settlement: 'outright',
    status: 'open',
    selections: mainSelections,
  });

  // Totals (over/under)
  if (seed.totalLine != null && seed.overOdds != null && seed.underOdds != null) {
    markets.push({
      id: `${idBase}-m1`,
      templateKey: 'totals',
      name: `Total Points / Goals`,
      settlement: 'line',
      status: 'open',
      line: seed.totalLine,
      selections: [
        sel(`${idBase}-m1-s0`, `Over ${seed.totalLine}`, seed.overOdds, { line: seed.totalLine, side: 'over' }),
        sel(`${idBase}-m1-s1`, `Under ${seed.totalLine}`, seed.underOdds, { line: seed.totalLine, side: 'under' }),
      ],
    });
  }

  return markets;
}

function buildMatch(seed: FixtureSeed, index: number, now: number): Match {
  const idBase = `mock-${seed.sportKey}-${seed.competitionKey}-${index}`;
  const isLive = seed.offsetMin < 0;
  const startTime = new Date(now + seed.offsetMin * MIN).toISOString();
  const def = MOCK_SPORTS.find((s) => s.key === seed.sportKey);
  const hasDraw = def?.hasDraw ?? false;

  const participants: Participant[] = [
    { id: `${idBase}-home`, name: seed.home.name, short: seed.home.short, side: 'home' },
    { id: `${idBase}-away`, name: seed.away.name, short: seed.away.short, side: 'away' },
  ];

  return {
    id: idBase,
    competitionKey: seed.competitionKey,
    sportKey: seed.sportKey,
    name: `${seed.home.name} vs ${seed.away.name}`,
    participants,
    startTime,
    status: isLive ? 'live' : 'scheduled',
    markets: buildMarkets(seed, hasDraw, idBase),
  };
}

// ---------------------------------------------------------------------------
// Fixture seeds (decimal odds chosen to feel believable)
// ---------------------------------------------------------------------------

const FIXTURES: FixtureSeed[] = [
  // -- Football: Premier League ------------------------------------------------
  { competitionKey: 'epl', sportKey: 'football', home: { name: 'Riverside United', short: 'RIV' }, away: { name: 'Kingsbridge City', short: 'KBC' }, offsetMin: -67, score: [2, 1], clock: "67'", homeOdds: 1.72, drawOdds: 3.9, awayOdds: 4.6, totalLine: 2.5, overOdds: 1.66, underOdds: 2.25 },
  { competitionKey: 'epl', sportKey: 'football', home: { name: 'Harborough FC', short: 'HAR' }, away: { name: 'Northgate Rovers', short: 'NGR' }, offsetMin: 90, homeOdds: 2.1, drawOdds: 3.3, awayOdds: 3.4, totalLine: 2.5, overOdds: 1.9, underOdds: 1.95 },
  { competitionKey: 'epl', sportKey: 'football', home: { name: 'Ashford Athletic', short: 'ASH' }, away: { name: 'Meadowvale FC', short: 'MDV' }, offsetMin: 26 * HOUR / MIN, homeOdds: 1.55, drawOdds: 4.2, awayOdds: 5.5, totalLine: 3.5, overOdds: 2.4, underOdds: 1.58 },

  // -- Football: La Liga -------------------------------------------------------
  { competitionKey: 'laliga', sportKey: 'football', home: { name: 'Real Montaña', short: 'RMO' }, away: { name: 'Atlético Costa', short: 'ATC' }, offsetMin: -34, score: [0, 0], clock: "34'", homeOdds: 2.3, drawOdds: 3.1, awayOdds: 3.0, totalLine: 2.5, overOdds: 2.0, underOdds: 1.82 },
  { competitionKey: 'laliga', sportKey: 'football', home: { name: 'Sevilla Norte', short: 'SVN' }, away: { name: 'Valencia Marina', short: 'VLM' }, offsetMin: 4 * HOUR / MIN, homeOdds: 1.95, drawOdds: 3.4, awayOdds: 3.7, totalLine: 2.5, overOdds: 1.85, underOdds: 2.0 },
  { competitionKey: 'laliga', sportKey: 'football', home: { name: 'Bilbao Roja', short: 'BIL' }, away: { name: 'Granada Sol', short: 'GRA' }, offsetMin: 28 * HOUR / MIN, homeOdds: 1.8, drawOdds: 3.5, awayOdds: 4.2, totalLine: 2.5, overOdds: 1.95, underOdds: 1.9 },

  // -- Football: Champions League ---------------------------------------------
  { competitionKey: 'ucl', sportKey: 'football', home: { name: 'Bavaria München', short: 'BAV' }, away: { name: 'Lisbon Estrela', short: 'LIS' }, offsetMin: -52, score: [1, 1], clock: "52'", homeOdds: 1.6, drawOdds: 4.0, awayOdds: 5.0, totalLine: 3.5, overOdds: 2.1, underOdds: 1.75 },
  { competitionKey: 'ucl', sportKey: 'football', home: { name: 'Paris Lumière', short: 'PAR' }, away: { name: 'Milano Nerazzurri', short: 'MIL' }, offsetMin: 3 * HOUR / MIN, homeOdds: 2.0, drawOdds: 3.5, awayOdds: 3.5, totalLine: 2.5, overOdds: 1.8, underOdds: 2.05 },
  { competitionKey: 'ucl', sportKey: 'football', home: { name: 'Amsterdam Ajaxen', short: 'AMS' }, away: { name: 'Porto Dragões', short: 'POR' }, offsetMin: 27 * HOUR / MIN, homeOdds: 2.25, drawOdds: 3.4, awayOdds: 2.95, totalLine: 2.5, overOdds: 1.92, underOdds: 1.92 },

  // -- Cricket: IPL ------------------------------------------------------------
  { competitionKey: 'ipl', sportKey: 'cricket', home: { name: 'Mumbai Mavericks', short: 'MUM' }, away: { name: 'Chennai Chargers', short: 'CHE' }, offsetMin: -45, score: [128, 92], clock: '14.2 ov', homeOdds: 1.7, awayOdds: 2.15, totalLine: 168.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'ipl', sportKey: 'cricket', home: { name: 'Bangalore Blazers', short: 'BLR' }, away: { name: 'Kolkata Knights', short: 'KOL' }, offsetMin: 5 * HOUR / MIN, homeOdds: 1.85, awayOdds: 1.95, totalLine: 175.5, overOdds: 1.88, underOdds: 1.92 },
  { competitionKey: 'ipl', sportKey: 'cricket', home: { name: 'Delhi Daredevils', short: 'DEL' }, away: { name: 'Rajasthan Royals', short: 'RAJ' }, offsetMin: 29 * HOUR / MIN, homeOdds: 2.05, awayOdds: 1.78, totalLine: 162.5, overOdds: 1.9, underOdds: 1.9 },

  // -- Cricket: BBL ------------------------------------------------------------
  { competitionKey: 'bbl', sportKey: 'cricket', home: { name: 'Sydney Sixers', short: 'SYD' }, away: { name: 'Perth Scorchers', short: 'PER' }, offsetMin: -20, score: [54, 0], clock: '6.4 ov', homeOdds: 2.0, awayOdds: 1.82, totalLine: 158.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'bbl', sportKey: 'cricket', home: { name: 'Melbourne Stars', short: 'MLS' }, away: { name: 'Adelaide Strikers', short: 'ADE' }, offsetMin: 8 * HOUR / MIN, homeOdds: 1.92, awayOdds: 1.88, totalLine: 165.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'bbl', sportKey: 'cricket', home: { name: 'Brisbane Heat', short: 'BRI' }, away: { name: 'Hobart Hurricanes', short: 'HOB' }, offsetMin: 32 * HOUR / MIN, homeOdds: 1.75, awayOdds: 2.1, totalLine: 170.5, overOdds: 1.9, underOdds: 1.9 },

  // -- Tennis: ATP -------------------------------------------------------------
  { competitionKey: 'atp', sportKey: 'tennis', home: { name: 'L. Nováček', short: 'NOV' }, away: { name: 'D. Ferraro', short: 'FER' }, offsetMin: -38, score: [1, 0], clock: 'Set 2', homeOdds: 1.55, awayOdds: 2.45 },
  { competitionKey: 'atp', sportKey: 'tennis', home: { name: 'M. Sorensen', short: 'SOR' }, away: { name: 'R. Castillo', short: 'CAS' }, offsetMin: 2 * HOUR / MIN, homeOdds: 1.9, awayOdds: 1.9 },
  { competitionKey: 'atp', sportKey: 'tennis', home: { name: 'A. Volkov', short: 'VOL' }, away: { name: 'J. Tanaka', short: 'TAN' }, offsetMin: 6 * HOUR / MIN, homeOdds: 2.2, awayOdds: 1.66 },
  { competitionKey: 'atp', sportKey: 'tennis', home: { name: 'P. Almeida', short: 'ALM' }, away: { name: 'S. Okafor', short: 'OKA' }, offsetMin: 30 * HOUR / MIN, homeOdds: 1.45, awayOdds: 2.7 },

  // -- Basketball: NBA ---------------------------------------------------------
  { competitionKey: 'nba', sportKey: 'basketball', home: { name: 'Bay City Tides', short: 'BAY' }, away: { name: 'Capital Thunder', short: 'CAP' }, offsetMin: -22, score: [58, 61], clock: 'Q3 4:12', homeOdds: 1.78, awayOdds: 2.05, totalLine: 221.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'nba', sportKey: 'basketball', home: { name: 'Lakeshore Kings', short: 'LAK' }, away: { name: 'Desert Suns', short: 'DES' }, offsetMin: 3 * HOUR / MIN, homeOdds: 1.65, awayOdds: 2.25, totalLine: 228.5, overOdds: 1.92, underOdds: 1.88 },
  { competitionKey: 'nba', sportKey: 'basketball', home: { name: 'Motor City Pistons', short: 'MOT' }, away: { name: 'Emerald Sonics', short: 'EME' }, offsetMin: 7 * HOUR / MIN, homeOdds: 2.4, awayOdds: 1.58, totalLine: 215.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'nba', sportKey: 'basketball', home: { name: 'Windy City Bulls', short: 'WIN' }, away: { name: 'Harbor Heat', short: 'HBH' }, offsetMin: 31 * HOUR / MIN, homeOdds: 1.95, awayOdds: 1.85, totalLine: 224.5, overOdds: 1.9, underOdds: 1.9 },

  // -- Kabaddi: Pro Kabaddi ----------------------------------------------------
  { competitionKey: 'prokabaddi', sportKey: 'kabaddi', home: { name: 'Jaipur Panthers', short: 'JAI' }, away: { name: 'Patna Pirates', short: 'PAT' }, offsetMin: -18, score: [24, 21], clock: '2nd Half', homeOdds: 1.8, awayOdds: 1.95, totalLine: 64.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'prokabaddi', sportKey: 'kabaddi', home: { name: 'Bengaluru Bulls', short: 'BEN' }, away: { name: 'U Mumba Warriors', short: 'UMW' }, offsetMin: 4 * HOUR / MIN, homeOdds: 1.7, awayOdds: 2.1, totalLine: 68.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'prokabaddi', sportKey: 'kabaddi', home: { name: 'Telugu Titans', short: 'TEL' }, away: { name: 'Haryana Steelers', short: 'HAR' }, offsetMin: 28 * HOUR / MIN, homeOdds: 2.0, awayOdds: 1.82, totalLine: 66.5, overOdds: 1.9, underOdds: 1.9 },

  // -- Volleyball: Nations League ---------------------------------------------
  { competitionKey: 'volleynations', sportKey: 'volleyball', home: { name: 'Brazil Aurinegro', short: 'BRA' }, away: { name: 'Poland Orły', short: 'POL' }, offsetMin: -25, score: [1, 1], clock: 'Set 3', homeOdds: 1.7, awayOdds: 2.1 },
  { competitionKey: 'volleynations', sportKey: 'volleyball', home: { name: 'Italy Azzurri', short: 'ITA' }, away: { name: 'France Bleus', short: 'FRA' }, offsetMin: 5 * HOUR / MIN, homeOdds: 1.85, awayOdds: 1.95 },
  { competitionKey: 'volleynations', sportKey: 'volleyball', home: { name: 'USA Stars', short: 'USA' }, away: { name: 'Japan Ryūjin', short: 'JPN' }, offsetMin: 30 * HOUR / MIN, homeOdds: 2.15, awayOdds: 1.7 },

  // -- Esports: CS2 / Valorant / Dota2 ----------------------------------------
  { competitionKey: 'cs2', sportKey: 'esports', home: { name: 'Vortex Esports', short: 'VTX' }, away: { name: 'Nebula Gaming', short: 'NBL' }, offsetMin: -30, score: [11, 8], clock: 'Map 2', homeOdds: 1.65, awayOdds: 2.2, totalLine: 26.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'valorant', sportKey: 'esports', home: { name: 'Phantom Five', short: 'PH5' }, away: { name: 'Radiant Order', short: 'RDO' }, offsetMin: 2 * HOUR / MIN, homeOdds: 1.88, awayOdds: 1.92, totalLine: 22.5, overOdds: 1.9, underOdds: 1.9 },
  { competitionKey: 'dota2', sportKey: 'esports', home: { name: 'Ancient Titans', short: 'ANT' }, away: { name: 'Roshan Pack', short: 'RSH' }, offsetMin: 6 * HOUR / MIN, homeOdds: 2.05, awayOdds: 1.78, totalLine: 2.5, overOdds: 1.85, underOdds: 1.95 },
  { competitionKey: 'cs2', sportKey: 'esports', home: { name: 'Spectre Squad', short: 'SPC' }, away: { name: 'Apex Collective', short: 'APX' }, offsetMin: 26 * HOUR / MIN, homeOdds: 1.95, awayOdds: 1.85, totalLine: 26.5, overOdds: 1.9, underOdds: 1.9 },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MockMatchesOpts {
  status?: string;
  sportKey?: string;
  /** Reference epoch ms; defaults to call-time now. Never read at module load. */
  now?: number;
}

/**
 * Returns demo fixtures matching the optional filters. Live fixtures carry a
 * score + clock (via {@link liveScore}); scheduled ones are in the near future.
 */
export function mockMatches(opts: MockMatchesOpts = {}): Match[] {
  const now = opts.now ?? Date.now();
  let matches = FIXTURES.map((seed, i) => buildMatch(seed, i, now));

  if (opts.sportKey) {
    matches = matches.filter((m) => m.sportKey === opts.sportKey);
  }
  if (opts.status) {
    matches = matches.filter((m) => m.status === opts.status);
  }
  return matches;
}

/** Find a single mock match by its generated id (for the detail page fallback). */
export function mockMatchById(id: string, now: number = Date.now()): Match | undefined {
  return mockMatches({ now }).find((m) => m.id === id);
}

const SCORE_BY_ID: Record<string, [number, number]> = {};
const CLOCK_BY_ID: Record<string, string> = {};
FIXTURES.forEach((seed, i) => {
  const id = `mock-${seed.sportKey}-${seed.competitionKey}-${i}`;
  if (seed.score) SCORE_BY_ID[id] = seed.score;
  if (seed.clock) CLOCK_BY_ID[id] = seed.clock;
});

/** Live score `[home, away]` for a mock match id, if it is in-play. */
export function liveScore(matchId: string): [number, number] | undefined {
  return SCORE_BY_ID[matchId];
}

/** Display match clock for a mock match id (e.g. "67'", "Set 2"). */
export function matchClock(matchId: string): string | undefined {
  return CLOCK_BY_ID[matchId];
}

/** Deterministic brand color (HSL) for a team crest, derived from its name. */
export function crestColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 48%)`;
}

/** Up-to-two-letter initials for a crest badge. */
export function crestInitials(participant: { short?: string; name: string }): string {
  if (participant.short) return participant.short.slice(0, 3).toUpperCase();
  const words = participant.name.trim().split(/\s+/);
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
}

// ---------------------------------------------------------------------------
// Deterministic live-match "feel": stats, commentary, timeline.
//
// Everything below is seeded from the match id (never Date.now / Math.random at
// module scope), so the same match always yields the same believable numbers.
// ---------------------------------------------------------------------------

/** Cheap 32-bit string hash, used to seed a per-match PRNG. */
function seedFromId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — deterministic given a seed. Returns floats in [0, 1). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive from a PRNG. */
function randInt(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1));
}

/** A single labelled stat row for the live stat panel. */
export interface MatchStat {
  label: string;
  home: string | number;
  away: string | number;
  /** Optional 0–100 pair for a comparative bar (e.g. possession). */
  bar?: [number, number];
}

export interface CommentaryLine {
  minute: string;
  text: string;
}

export interface TimelineEvent {
  minute: number;
  type: 'goal' | 'card' | 'sub' | 'point';
  team: 'home' | 'away';
  text: string;
}

function homeAway(match: Match): { home: Participant; away: Participant } {
  const home = match.participants.find((p) => p.side === 'home') ?? match.participants[0];
  const away = match.participants.find((p) => p.side === 'away') ?? match.participants[1];
  // Fall back to a safe stub so callers never dereference undefined.
  const stub: Participant = { id: 'unknown', name: 'Home', side: 'home' };
  return { home: home ?? stub, away: away ?? { ...stub, id: 'unknown-away', name: 'Away', side: 'away' } };
}

/** Parse the leading integer out of a clock string like "67'" / "14.2 ov". */
function clockMinute(clock: string | undefined): number {
  if (!clock) return 0;
  const m = /(\d+)/.exec(clock);
  return m ? Number(m[1]) : 0;
}

/**
 * Sport-appropriate live stats for a match. Deterministic per match id, and
 * loosely consistent with the live score where one exists. Returns [] for
 * non-live matches.
 */
export function matchStats(match: Match): MatchStat[] {
  if (match.status !== 'live') return [];
  const next = rng(seedFromId(match.id));
  const score = liveScore(match.id);
  const clock = matchClock(match.id);
  const [hs, as] = score ?? [0, 0];

  switch (match.sportKey) {
    case 'football': {
      const poss = randInt(next, 38, 62);
      const hShots = hs * 2 + randInt(next, 3, 9);
      const aShots = as * 2 + randInt(next, 3, 9);
      return [
        { label: 'Possession', home: `${poss}%`, away: `${100 - poss}%`, bar: [poss, 100 - poss] },
        { label: 'Shots', home: hShots, away: aShots },
        { label: 'Shots on target', home: hs + randInt(next, 1, 4), away: as + randInt(next, 1, 4) },
        { label: 'Corners', home: randInt(next, 1, 8), away: randInt(next, 1, 8) },
        { label: 'Fouls', home: randInt(next, 5, 14), away: randInt(next, 5, 14) },
        { label: 'Yellow cards', home: randInt(next, 0, 3), away: randInt(next, 0, 3) },
        { label: 'Red cards', home: randInt(next, 0, 1), away: randInt(next, 0, 1) },
      ];
    }
    case 'basketball': {
      const quarter = clock?.split(' ')[0] ?? `Q${randInt(next, 1, 4)}`;
      return [
        { label: 'Quarter', home: quarter, away: quarter },
        { label: 'Points', home: hs, away: as },
        { label: 'Rebounds', home: randInt(next, 18, 42), away: randInt(next, 18, 42) },
        { label: 'Assists', home: randInt(next, 8, 26), away: randInt(next, 8, 26) },
        { label: '3-pointers', home: randInt(next, 4, 15), away: randInt(next, 4, 15) },
        { label: 'Turnovers', home: randInt(next, 5, 16), away: randInt(next, 5, 16) },
      ];
    }
    case 'cricket': {
      const overs = clock?.replace(' ov', '') ?? `${randInt(next, 5, 18)}.${randInt(next, 0, 5)}`;
      const wkts = randInt(next, 0, 6);
      const oversNum = Math.max(1, clockMinute(clock));
      const rr = (hs / oversNum).toFixed(2);
      return [
        { label: 'Overs', home: overs, away: '—' },
        { label: 'Runs', home: hs, away: as },
        { label: 'Wickets', home: wkts, away: randInt(next, 0, 6) },
        { label: 'Run rate', home: rr, away: (as / oversNum).toFixed(2) },
        { label: 'Boundaries (4s)', home: randInt(next, 4, 16), away: randInt(next, 4, 16) },
        { label: 'Sixes (6s)', home: randInt(next, 0, 8), away: randInt(next, 0, 8) },
      ];
    }
    case 'tennis': {
      const set = clock ?? `Set ${randInt(next, 1, 3)}`;
      return [
        { label: 'Sets', home: hs, away: as },
        { label: set, home: `${randInt(next, 0, 6)}`, away: `${randInt(next, 0, 6)}` },
        { label: 'Aces', home: randInt(next, 2, 14), away: randInt(next, 2, 14) },
        { label: 'Double faults', home: randInt(next, 0, 5), away: randInt(next, 0, 5) },
        { label: 'Break points', home: randInt(next, 0, 6), away: randInt(next, 0, 6) },
        { label: '1st serve %', home: `${randInt(next, 55, 78)}%`, away: `${randInt(next, 55, 78)}%` },
      ];
    }
    case 'kabaddi': {
      return [
        { label: 'Total points', home: hs, away: as },
        { label: 'Raid points', home: randInt(next, 8, 22), away: randInt(next, 8, 22) },
        { label: 'Tackle points', home: randInt(next, 4, 14), away: randInt(next, 4, 14) },
        { label: 'All-outs', home: randInt(next, 0, 3), away: randInt(next, 0, 3) },
        { label: 'Super raids', home: randInt(next, 0, 4), away: randInt(next, 0, 4) },
      ];
    }
    case 'volleyball': {
      const set = clock ?? `Set ${randInt(next, 1, 5)}`;
      return [
        { label: 'Sets', home: hs, away: as },
        { label: set, home: randInt(next, 8, 25), away: randInt(next, 8, 25) },
        { label: 'Aces', home: randInt(next, 1, 9), away: randInt(next, 1, 9) },
        { label: 'Blocks', home: randInt(next, 2, 12), away: randInt(next, 2, 12) },
        { label: 'Attack %', home: `${randInt(next, 38, 62)}%`, away: `${randInt(next, 38, 62)}%` },
      ];
    }
    case 'esports': {
      const map = clock ?? `Map ${randInt(next, 1, 3)}`;
      return [
        { label: map, home: `${hs}`, away: `${as}` },
        { label: 'Round score', home: hs, away: as },
        { label: 'Kills', home: randInt(next, 40, 90), away: randInt(next, 40, 90) },
        { label: 'Deaths', home: randInt(next, 40, 90), away: randInt(next, 40, 90) },
        { label: 'ADR', home: randInt(next, 60, 110), away: randInt(next, 60, 110) },
      ];
    }
    default:
      return [
        { label: 'Score', home: hs, away: as },
        { label: 'Momentum', home: `${randInt(next, 40, 60)}%`, away: `${randInt(next, 40, 60)}%` },
      ];
  }
}

const FOOTBALL_LINES = (h: string, a: string, next: () => number): string[] => [
  `Great work down the wing by ${h}, the cross is cleared for a corner.`,
  `${a} looking to build from the back, patient in possession.`,
  `Chance! A snapshot from the edge of the box flashes just wide.`,
  `Booking for a late challenge — the referee has seen enough.`,
  `${h} pressing high, forcing a hurried clearance.`,
  `Substitution being prepared on the touchline for ${a}.`,
  `What a save! The keeper gets down low to deny ${h}.`,
  `Tempo dropping as ${a} keep hold of the ball near the halfway line.`,
  `${h} win a free kick in a dangerous area, ${randInt(next, 22, 30)} yards out.`,
];

const GENERIC_LINES = (h: string, a: string, _next: () => number): string[] => [
  `${h} take the initiative and force the issue early.`,
  `${a} respond well, settling into a rhythm.`,
  `Momentum swinging as ${h} string together a strong sequence.`,
  `Timeout called — the coaching staff want a reset.`,
  `Crucial passage of play, and ${a} come out on top.`,
  `The crowd on their feet after a superb individual effort from ${h}.`,
  `${a} claw a point back to keep this contest alive.`,
  `Fine composure from ${h} under real pressure.`,
];

/**
 * 5–8 believable commentary lines for a live match, newest last. Minutes track
 * the match clock. Deterministic per id. Returns [] for non-live matches.
 */
export function commentary(match: Match): CommentaryLine[] {
  if (match.status !== 'live') return [];
  const { home, away } = homeAway(match);
  const next = rng(seedFromId(match.id) ^ 0x9e3779b9);
  const pool =
    match.sportKey === 'football'
      ? FOOTBALL_LINES(home.name, away.name, next)
      : GENERIC_LINES(home.name, away.name, next);

  const count = randInt(next, 5, 8);
  const clockUnit =
    match.sportKey === 'football' ? "'" : match.sportKey === 'cricket' ? ' ov' : '';
  const base = clockMinute(matchClock(match.id)) || randInt(next, 20, 70);

  const lines: CommentaryLine[] = [];
  for (let i = 0; i < count; i++) {
    const idx = randInt(next, 0, pool.length - 1);
    const minute = Math.max(1, base - (count - 1 - i) * randInt(next, 2, 6));
    lines.push({ minute: `${minute}${clockUnit}`, text: pool[idx] ?? '' });
  }
  return lines;
}

/**
 * Timeline of scoring / disciplinary events across the match so far. Ordered by
 * minute ascending. Deterministic per id. Returns [] for non-live matches.
 */
export function timeline(match: Match): TimelineEvent[] {
  if (match.status !== 'live') return [];
  const { home, away } = homeAway(match);
  const next = rng(seedFromId(match.id) ^ 0x85ebca6b);
  const score = liveScore(match.id) ?? [0, 0];
  const [hs, as] = score;
  const maxMinute = Math.max(6, clockMinute(matchClock(match.id)) || 60);

  const events: TimelineEvent[] = [];
  const pointVerb =
    match.sportKey === 'football'
      ? 'GOAL'
      : match.sportKey === 'basketball'
        ? 'Basket'
        : match.sportKey === 'cricket'
          ? 'Boundary'
          : 'Point';

  const pushScore = (team: 'home' | 'away', count: number) => {
    const name = team === 'home' ? home.name : away.name;
    for (let i = 0; i < Math.min(count, 5); i++) {
      events.push({
        minute: randInt(next, 3, maxMinute),
        type: match.sportKey === 'football' ? 'goal' : 'point',
        team,
        text: `${pointVerb} — ${name}`,
      });
    }
  };
  pushScore('home', hs);
  pushScore('away', as);

  // A couple of cards / subs for texture (football only).
  if (match.sportKey === 'football') {
    const cards = randInt(next, 1, 3);
    for (let i = 0; i < cards; i++) {
      const team: 'home' | 'away' = next() < 0.5 ? 'home' : 'away';
      events.push({
        minute: randInt(next, 5, maxMinute),
        type: 'card',
        team,
        text: `Yellow card — ${team === 'home' ? home.name : away.name}`,
      });
    }
    if (next() < 0.6) {
      const team: 'home' | 'away' = next() < 0.5 ? 'home' : 'away';
      events.push({
        minute: randInt(next, 30, maxMinute),
        type: 'sub',
        team,
        text: `Substitution — ${team === 'home' ? home.name : away.name}`,
      });
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

/** Progress fraction (0–1) through a live match, for the animated progress bar. */
export function matchProgress(match: Match): number {
  if (match.status !== 'live') return 0;
  const minute = clockMinute(matchClock(match.id));
  switch (match.sportKey) {
    case 'football':
      return Math.min(1, minute / 90);
    case 'cricket':
      return Math.min(1, minute / 20);
    case 'basketball':
      return Math.min(1, minute / 48);
    default:
      return Math.min(1, Math.max(0.15, minute / 60));
  }
}
