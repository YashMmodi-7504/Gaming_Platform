import { FraudRules, parseQuery, recommend, type RecItem } from '@gaming-platform/ai-core';

import { PromptManager } from './prompt-manager.service';

/**
 * Locks the AI semantics the backend relies on: prompt rendering (grounded,
 * never inventing values), NL-search intent parsing, recommendation ranking and
 * fraud rule outcomes — all via the deterministic ai-core engine.
 */
describe('AI platform semantics', () => {
  it('renders grounded prompts with substitution', () => {
    const prompts = new PromptManager();
    const text = prompts.render('revenue-insight', {
      hours: 24,
      bets: '1000',
      wins: '900',
      ggr: '100',
      rtp: '90%',
      deposits: '500',
      withdrawals: '300',
      cashFlow: '200',
    });
    expect(text).toContain('gross gaming revenue 100');
    expect(text).toContain('RTP 90%');
    expect(text).not.toContain('{{');
  });

  it('parses natural-language search intents', () => {
    expect(parseQuery('show me card games').filters.category).toBe('card');
    expect(parseQuery('tournaments today').entity).toBe('tournament');
    expect(parseQuery('players with suspicious activity').filters.suspicious).toBe(true);
  });

  it('recommends content similar to history', () => {
    const items: RecItem[] = [
      { id: 'a', text: 'card card card poker', popularity: 50, recency: 0.5 },
      { id: 'b', text: 'card card card teen patti', popularity: 40, recency: 0.5 },
      { id: 'c', text: 'crash crash crash multiplier', popularity: 90, recency: 1 },
    ];
    const recs = recommend(items, { history: ['a'] }, { limit: 2 });
    expect(recs[0]!.id).toBe('b');
  });

  it('flags a clearly fraudulent account', () => {
    const { band } = FraudRules.assess({
      accountId: 'x',
      sharedDeviceAccounts: ['y', 'z', 'w'],
      sharedIpAccounts: ['y'],
      distinctDevices: 4,
      distinctIpsLastHour: 12,
      betsLastMinute: 300,
      winRate: 0.97,
      roundsPlayed: 200,
      depositsLastHour: 30,
      actionIntervalStdDevMs: 5,
      withdrawalRatio: 1,
    });
    expect(band).toBe('critical');
  });
});
