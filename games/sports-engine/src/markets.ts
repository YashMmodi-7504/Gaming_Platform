import type { Market, MarketTemplate, Selection } from './types';

/**
 * The data-driven catalog of market types. Each entry maps a betting market to a
 * generic settlement mode plus presentation metadata. Adding a new market type
 * (including the listed Match Winner, Draw No Bet, Over/Under, Handicap, Correct
 * Score, First/Top Scorer, Race Winner and future markets) is pure configuration
 * — no engine code changes.
 */
export const MARKET_TEMPLATES: Record<string, MarketTemplate> = {
  'match-winner': {
    key: 'match-winner',
    name: 'Match Winner',
    settlement: 'outright',
    description: 'Pick the winner (1X2 where a draw applies).',
    selectionKind: 'participants',
    supportsLine: false,
    includesDraw: true,
  },
  'money-line': {
    key: 'money-line',
    name: 'Money Line',
    settlement: 'outright',
    description: 'Pick the winner (no draw).',
    selectionKind: 'participants',
    supportsLine: false,
    includesDraw: false,
  },
  'draw-no-bet': {
    key: 'draw-no-bet',
    name: 'Draw No Bet',
    settlement: 'outright',
    description: 'Winner market; stake voided on a draw.',
    selectionKind: 'participants',
    supportsLine: false,
    includesDraw: false,
  },
  'double-chance': {
    key: 'double-chance',
    name: 'Double Chance',
    settlement: 'outright',
    description: 'Two of three outcomes covered.',
    selectionKind: 'custom',
    supportsLine: false,
  },
  'over-under': {
    key: 'over-under',
    name: 'Over / Under',
    settlement: 'line',
    description: 'Total above or below a line.',
    selectionKind: 'line',
    supportsLine: true,
  },
  handicap: {
    key: 'handicap',
    name: 'Handicap',
    settlement: 'line',
    description: 'Result with a points/goals handicap applied.',
    selectionKind: 'line',
    supportsLine: true,
  },
  'correct-score': {
    key: 'correct-score',
    name: 'Correct Score',
    settlement: 'outright',
    description: 'Exact final score.',
    selectionKind: 'scoreline',
    supportsLine: false,
  },
  'first-scorer': {
    key: 'first-scorer',
    name: 'First Scorer',
    settlement: 'outright',
    description: 'First player to score.',
    selectionKind: 'custom',
    supportsLine: false,
  },
  'top-scorer': {
    key: 'top-scorer',
    name: 'Top Scorer',
    settlement: 'outright',
    description: 'Tournament / match top scorer.',
    selectionKind: 'custom',
    supportsLine: false,
  },
  'both-teams-to-score': {
    key: 'both-teams-to-score',
    name: 'Both Teams To Score',
    settlement: 'outright',
    description: 'Will both sides score?',
    selectionKind: 'binary',
    supportsLine: false,
  },
  'race-winner': {
    key: 'race-winner',
    name: 'Race Winner',
    settlement: 'outright',
    description: 'Winner of a race (horse / greyhound / motor).',
    selectionKind: 'participants',
    supportsLine: false,
  },
  'outright-winner': {
    key: 'outright-winner',
    name: 'Outright Winner',
    settlement: 'outright',
    description: 'Tournament / competition winner.',
    selectionKind: 'participants',
    supportsLine: false,
  },
};

export const MARKET_TEMPLATE_KEYS = Object.keys(MARKET_TEMPLATES);

/** Resolves market templates and validates market construction from config. */
export const MarketManager = {
  template(key: string): MarketTemplate | undefined {
    return MARKET_TEMPLATES[key];
  },

  /** All known templates (built-in plus any supplied custom overrides). */
  all(custom: Record<string, MarketTemplate> = {}): MarketTemplate[] {
    return [...new Set([...MARKET_TEMPLATE_KEYS, ...Object.keys(custom)])].map(
      (k) => custom[k] ?? MARKET_TEMPLATES[k]!,
    );
  },

  /** Build a validated market from a template key + selections. */
  build(input: {
    id: string;
    templateKey: string;
    name?: string;
    selections: Selection[];
    line?: number;
    custom?: Record<string, MarketTemplate>;
  }): Market {
    const template = input.custom?.[input.templateKey] ?? MARKET_TEMPLATES[input.templateKey];
    if (!template) throw new Error(`Unknown market template "${input.templateKey}"`);
    if (input.selections.length === 0) {
      throw new Error(`Market "${input.id}" requires at least one selection`);
    }
    return {
      id: input.id,
      templateKey: template.key,
      name: input.name ?? template.name,
      settlement: template.settlement,
      status: 'open',
      selections: input.selections,
      line: input.line,
    };
  },

  /** Find a selection within a market. */
  selection(market: Market, selectionId: string): Selection | undefined {
    return market.selections.find((s) => s.id === selectionId);
  },
};
