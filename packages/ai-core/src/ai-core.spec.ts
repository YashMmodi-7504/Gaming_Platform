import { describe, expect, it } from 'vitest';

import { cosine, embed, nearest, tokenize } from './embeddings';
import { FraudRules, type FraudFeatures } from './fraud';
import { recommend, similar, trending, type RecItem } from './recommend';
import { RiskScoring, type BehaviourFeatures } from './risk';
import { parseQuery } from './search';
import { Segmentation, type RfmFeatures } from './segment';

// The backend repeats the category token to weight it above secondary features.
const games: RecItem[] = [
  { id: 'teen-patti', text: 'card card card poker teen patti high volatility', popularity: 90, recency: 0.9, rtp: 97 },
  { id: 'andar-bahar', text: 'card card card andar bahar low volatility', popularity: 80, recency: 0.7, rtp: 96 },
  { id: 'roulette', text: 'table table table european roulette medium volatility', popularity: 70, recency: 0.5, rtp: 97.3 },
  { id: 'crash', text: 'crash crash crash multiplier instant high volatility', popularity: 95, recency: 1, rtp: 99 },
];

describe('embeddings', () => {
  it('tokenizes and embeds to unit vectors', () => {
    expect(tokenize('Show me CARD games!')).toEqual(['card', 'games']);
    const v = embed('card game');
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1, 5);
  });

  it('scores similar text higher than dissimilar', () => {
    const a = embed('card poker game');
    const close = embed('poker card table');
    const far = embed('crash multiplier instant');
    expect(cosine(a, close)).toBeGreaterThan(cosine(a, far));
  });

  it('finds nearest items', () => {
    const vectors = games.map((g) => ({ id: g.id, vector: embed(g.text) }));
    const res = nearest(embed(games[0]!.text), vectors, 2, new Set(['teen-patti']));
    expect(res[0]!.id).toBe('andar-bahar'); // both are card games
  });
});

describe('recommendations', () => {
  it('recommends content similar to history, excluding played', () => {
    const recs = recommend(games, { history: ['teen-patti'] }, { limit: 3 });
    expect(recs.map((r) => r.id)).not.toContain('teen-patti');
    expect(recs[0]!.id).toBe('andar-bahar'); // nearest by content
  });

  it('falls back to popularity with no history', () => {
    const recs = recommend(games, { history: [] }, { limit: 1 });
    expect(recs[0]!.id).toBe('crash'); // highest popularity/recency
  });

  it('computes similar items and trending', () => {
    expect(similar('teen-patti', games, 1)[0]!.id).toBe('andar-bahar');
    expect(trending(games, 1)[0]!.id).toBe('crash');
  });
});

describe('fraud detection', () => {
  const base: FraudFeatures = {
    accountId: 'a1',
    sharedDeviceAccounts: [],
    sharedIpAccounts: [],
    distinctDevices: 1,
    distinctIpsLastHour: 1,
    betsLastMinute: 2,
    winRate: 0.4,
    roundsPlayed: 200,
    depositsLastHour: 1,
    actionIntervalStdDevMs: 800,
    withdrawalRatio: 0.3,
  };

  it('clears a normal account', () => {
    const { band, signals } = FraudRules.assess(base);
    expect(band).toBe('low');
    expect(signals).toHaveLength(0);
  });

  it('flags multi-account + bot + impossible win rate', () => {
    const { score, band, signals } = FraudRules.assess({
      ...base,
      sharedDeviceAccounts: ['a2', 'a3', 'a4'],
      winRate: 0.97,
      actionIntervalStdDevMs: 10,
      betsLastMinute: 250,
    });
    const types = signals.map((s) => s.type);
    expect(types).toContain('multi-account');
    expect(types).toContain('impossible-win-rate');
    expect(types).toContain('bot-activity');
    expect(types).toContain('velocity');
    expect(score).toBe(100);
    expect(band).toBe('critical');
  });
});

describe('risk & responsible gaming', () => {
  const calm: BehaviourFeatures = {
    longestSessionMinutes: 30,
    netLoss: 0,
    depositsLast24h: 1,
    lossChasingScore: 0,
    nightPlayRatio: 0.1,
    depositLimitUtilisation: 0.2,
  };

  it('scores low risk for calm play', () => {
    expect(RiskScoring.overall(calm, 0).band).toBe('low');
  });

  it('raises flags for problematic play', () => {
    const risky: BehaviourFeatures = {
      longestSessionMinutes: 300,
      netLoss: 5000,
      depositsLast24h: 10,
      lossChasingScore: 0.8,
      nightPlayRatio: 0.8,
      depositLimitUtilisation: 1.1,
    };
    const flags = RiskScoring.responsibleGaming(risky);
    expect(flags.map((f) => f.code)).toContain('loss-chasing');
    expect(RiskScoring.overall(risky, 60).band === 'high' || RiskScoring.overall(risky, 60).band === 'critical').toBe(true);
  });
});

describe('segmentation & churn', () => {
  it('segments players and predicts churn', () => {
    const vip: RfmFeatures = { recencyDays: 1, frequency: 30, monetary: 8000, tenureDays: 400 };
    expect(Segmentation.segment(vip)).toBe('vip');
    const churned: RfmFeatures = { recencyDays: 90, frequency: 1, monetary: 0, tenureDays: 200 };
    expect(Segmentation.segment(churned)).toBe('churned');
    expect(Segmentation.churnProbability(churned)).toBeGreaterThan(0.6);
    expect(Segmentation.retentionAction('churned', 0.9)).toBe('win-back-bonus');
  });
});

describe('natural-language search', () => {
  it('parses "show me card games"', () => {
    const intent = parseQuery('show me card games');
    expect(intent.entity).toBe('game');
    expect(intent.filters.category).toBe('card');
  });

  it('parses "highest RTP games"', () => {
    const intent = parseQuery('highest RTP games');
    expect(intent.sort).toBe('rtp');
    expect(intent.sortDir).toBe('desc');
  });

  it('parses "show tournaments today"', () => {
    const intent = parseQuery('show tournaments today');
    expect(intent.entity).toBe('tournament');
    expect(intent.filters.today).toBe(true);
  });

  it('parses "players with suspicious activity"', () => {
    const intent = parseQuery('players with suspicious activity');
    expect(intent.entity).toBe('player');
    expect(intent.filters.suspicious).toBe(true);
  });

  it('extracts rtp threshold', () => {
    expect(parseQuery('games with rtp over 96').filters.rtpMin).toBe(96);
  });
});
