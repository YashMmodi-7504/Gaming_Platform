import type { SportDefinition } from './types';

/**
 * Built-in sport definitions. Each entry is **pure configuration** declaring the
 * market types a sport offers and its participant model. Adding a new sport means
 * adding a definition (or an admin-defined one) — never new engine code.
 */
export const SPORT_PRESETS: Record<string, SportDefinition> = {
  football: {
    key: 'football',
    name: 'Football',
    category: 'ball',
    hasDraw: true,
    participantNoun: 'team',
    marketTypes: ['match-winner', 'draw-no-bet', 'double-chance', 'over-under', 'handicap', 'correct-score', 'first-scorer', 'both-teams-to-score'],
  },
  cricket: {
    key: 'cricket',
    name: 'Cricket',
    category: 'ball',
    hasDraw: true,
    participantNoun: 'team',
    marketTypes: ['match-winner', 'over-under', 'top-scorer', 'handicap'],
  },
  tennis: {
    key: 'tennis',
    name: 'Tennis',
    category: 'racket',
    hasDraw: false,
    participantNoun: 'player',
    marketTypes: ['money-line', 'over-under', 'handicap', 'correct-score'],
  },
  basketball: {
    key: 'basketball',
    name: 'Basketball',
    category: 'ball',
    hasDraw: false,
    participantNoun: 'team',
    marketTypes: ['money-line', 'over-under', 'handicap'],
  },
  baseball: {
    key: 'baseball',
    name: 'Baseball',
    category: 'ball',
    hasDraw: false,
    participantNoun: 'team',
    marketTypes: ['money-line', 'over-under', 'handicap'],
  },
  golf: {
    key: 'golf',
    name: 'Golf',
    category: 'individual',
    hasDraw: false,
    participantNoun: 'player',
    marketTypes: ['outright-winner', 'top-scorer'],
  },
  'horse-racing': {
    key: 'horse-racing',
    name: 'Horse Racing',
    category: 'racing',
    hasDraw: false,
    participantNoun: 'horse',
    marketTypes: ['race-winner'],
  },
  'greyhound-racing': {
    key: 'greyhound-racing',
    name: 'Greyhound Racing',
    category: 'racing',
    hasDraw: false,
    participantNoun: 'greyhound',
    marketTypes: ['race-winner'],
  },
  kabaddi: {
    key: 'kabaddi',
    name: 'Kabaddi',
    category: 'contact',
    hasDraw: true,
    participantNoun: 'team',
    marketTypes: ['match-winner', 'over-under', 'handicap'],
  },
  badminton: {
    key: 'badminton',
    name: 'Badminton',
    category: 'racket',
    hasDraw: false,
    participantNoun: 'player',
    marketTypes: ['money-line', 'over-under', 'handicap'],
  },
  volleyball: {
    key: 'volleyball',
    name: 'Volleyball',
    category: 'ball',
    hasDraw: false,
    participantNoun: 'team',
    marketTypes: ['money-line', 'over-under', 'handicap'],
  },
  snooker: {
    key: 'snooker',
    name: 'Snooker',
    category: 'cue',
    hasDraw: false,
    participantNoun: 'player',
    marketTypes: ['money-line', 'over-under', 'correct-score'],
  },
  'table-tennis': {
    key: 'table-tennis',
    name: 'Table Tennis',
    category: 'racket',
    hasDraw: false,
    participantNoun: 'player',
    marketTypes: ['money-line', 'over-under', 'handicap'],
  },
  'ice-hockey': {
    key: 'ice-hockey',
    name: 'Ice Hockey',
    category: 'ball',
    hasDraw: true,
    participantNoun: 'team',
    marketTypes: ['match-winner', 'over-under', 'handicap', 'both-teams-to-score'],
  },
  esports: {
    key: 'esports',
    name: 'Esports',
    category: 'esports',
    hasDraw: false,
    participantNoun: 'team',
    marketTypes: ['money-line', 'over-under', 'handicap', 'correct-score'],
  },
  'motor-sports': {
    key: 'motor-sports',
    name: 'Motor Sports',
    category: 'racing',
    hasDraw: false,
    participantNoun: 'driver',
    marketTypes: ['race-winner', 'outright-winner'],
  },
  rugby: {
    key: 'rugby',
    name: 'Rugby',
    category: 'contact',
    hasDraw: true,
    participantNoun: 'team',
    marketTypes: ['match-winner', 'over-under', 'handicap'],
  },
  boxing: {
    key: 'boxing',
    name: 'Boxing',
    category: 'combat',
    hasDraw: true,
    participantNoun: 'fighter',
    marketTypes: ['match-winner', 'over-under', 'correct-score'],
  },
};

export const SPORT_KEYS = Object.keys(SPORT_PRESETS);
export const DEFAULT_SPORT = 'football';

/** Resolves a sport key into its definition (custom definitions take priority). */
export class SportResolver {
  constructor(private readonly custom: Record<string, SportDefinition> = {}) {}

  has(key: string): boolean {
    return key in this.custom || key in SPORT_PRESETS;
  }

  keys(): string[] {
    return [...new Set([...SPORT_KEYS, ...Object.keys(this.custom)])];
  }

  resolve(key: string): SportDefinition {
    const sport = this.custom[key] ?? SPORT_PRESETS[key];
    if (!sport) throw new Error(`Unknown sport "${key}"`);
    return sport;
  }

  all(): SportDefinition[] {
    return this.keys().map((k) => this.resolve(k));
  }
}
