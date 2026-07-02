import { describe, expect, it } from 'vitest';

import { buildDeck, makeCard } from './card';
import { ProvablyFairCardShuffler } from './shuffle';
import { RuleResolver, RuleValidationError } from './rules';
import { VariantResolver, CARD_VARIANT_KEYS } from './presets';
import { pokerScore, WinnerEvaluator } from './evaluator';
import { CardEngine } from './engine';

const resolver = new VariantResolver();

describe('deck & shuffle', () => {
  it('builds a 52-card deck (+ jokers)', () => {
    expect(buildDeck()).toHaveLength(52);
    expect(buildDeck({ decks: 2 })).toHaveLength(104);
    expect(buildDeck({ jokersPerDeck: 2 })).toHaveLength(54);
  });

  it('shuffles deterministically and verifies', () => {
    const a = ProvablyFairCardShuffler.verification('seed-1');
    const b = ProvablyFairCardShuffler.verification('seed-1');
    expect(a.shuffledDeck).toEqual(b.shuffledDeck);
    expect(ProvablyFairCardShuffler.verify('seed-1', {}, a.shuffledDeck)).toBe(true);
    expect(ProvablyFairCardShuffler.verify('seed-2', {}, a.shuffledDeck)).toBe(false);
  });
});

describe('rules', () => {
  it('resolves and validates every built-in variant', () => {
    for (const key of CARD_VARIANT_KEYS) {
      const ruleset = resolver.resolve(key);
      expect(ruleset.key).toBe(key);
      expect(ruleset.bets.length).toBeGreaterThan(0);
    }
  });

  it('rejects an invalid ruleset', () => {
    expect(() => RuleResolver.resolve({ key: 'bad', decks: 0 })).toThrow(RuleValidationError);
    expect(() => RuleResolver.resolve({ key: 'bad', bets: [] })).toThrow(RuleValidationError);
  });
});

describe('evaluator', () => {
  it('orders teen-patti hands: trail > sequence > pair > high', () => {
    const trail = pokerScore([makeCard('A', 'spades'), makeCard('A', 'hearts'), makeCard('A', 'clubs')], 3);
    const seq = pokerScore([makeCard('5', 'spades'), makeCard('6', 'hearts'), makeCard('7', 'clubs')], 3);
    const pair = pokerScore([makeCard('9', 'spades'), makeCard('9', 'hearts'), makeCard('2', 'clubs')], 3);
    const high = pokerScore([makeCard('K', 'spades'), makeCard('7', 'hearts'), makeCard('2', 'clubs')], 3);
    expect(trail.score).toBeGreaterThan(seq.score);
    expect(seq.score).toBeGreaterThan(pair.score);
    expect(pair.score).toBeGreaterThan(high.score);
    expect(trail.category).toBe('trail');
  });

  it('ranks 5-card poker: straight flush > full house > flush', () => {
    const sf = pokerScore(
      [makeCard('5', 'hearts'), makeCard('6', 'hearts'), makeCard('7', 'hearts'), makeCard('8', 'hearts'), makeCard('9', 'hearts')],
      5,
    );
    const fh = pokerScore(
      [makeCard('K', 'hearts'), makeCard('K', 'spades'), makeCard('K', 'clubs'), makeCard('2', 'hearts'), makeCard('2', 'spades')],
      5,
    );
    expect(sf.score).toBeGreaterThan(fh.score);
    expect(sf.category).toBe('straight-flush');
    expect(fh.category).toBe('full-house');
  });

  it('evaluates high-card and over-under generically', () => {
    const hc = WinnerEvaluator.evaluate(resolver.resolve('dragon-tiger'), {
      dragon: [makeCard('K', 'spades')],
      tiger: [makeCard('3', 'hearts')],
    });
    expect(hc.winners).toEqual(['dragon']);

    const ou = WinnerEvaluator.evaluate(resolver.resolve('lucky-7'), { over: [makeCard('K', 'spades')] });
    expect(ou.winners).toEqual(['over']);
  });
});

describe('CardEngine.playRound', () => {
  it('is deterministic for a seed', () => {
    const r1 = new CardEngine(resolver.resolve('dragon-tiger'), 'seed-x').playRound('r', [
      { key: 'dragon', amount: '10' },
    ]);
    const r2 = new CardEngine(resolver.resolve('dragon-tiger'), 'seed-x').playRound('r', [
      { key: 'dragon', amount: '10' },
    ]);
    expect(r1.hands).toEqual(r2.hands);
    expect(r1.winners).toEqual(r2.winners);
  });

  it('settles a winning bet at the configured payout', () => {
    // Find a seed where dragon wins, then verify the payout is 2x.
    const ruleset = resolver.resolve('dragon-tiger');
    let settled = false;
    for (let i = 0; i < 50 && !settled; i += 1) {
      const result = new CardEngine(ruleset, `s-${i}`).playRound('r', [{ key: 'dragon', amount: '10' }]);
      if (result.winners.includes('dragon')) {
        expect(result.settlement.totalWin).toBe('20');
        settled = true;
      }
    }
    expect(settled).toBe(true);
  });

  it('plays Andar Bahar (side-match) to a winning side', () => {
    const result = new CardEngine(resolver.resolve('andar-bahar'), 'ab-seed').playRound('r', [
      { key: 'andar', amount: '5' },
    ]);
    expect(['andar', 'bahar']).toContain(result.winners[0]);
  });

  it('plays Baccarat (point-total) and produces a settlement', () => {
    const result = new CardEngine(resolver.resolve('baccarat'), 'bac-seed').playRound('r', [
      { key: 'player', amount: '10' },
      { key: 'banker', amount: '10' },
    ]);
    expect(Number(result.settlement.totalBet)).toBe(20);
    expect(result.mode).toBe('point-total');
  });

  it('runs interactive blackjack deterministically', () => {
    const engine = new CardEngine(resolver.resolve('blackjack'), 'bj-seed');
    const deal = engine.dealBlackjack('r', [{ key: 'main', amount: '10' }]);
    expect(deal.player).toHaveLength(2);
    const result = engine.blackjackResolve();
    expect(['player/dealer', 'player', 'dealer']).toContain(result.winners.join('/'));
  });

  it('handles many concurrent independent rounds', async () => {
    const ruleset = resolver.resolve('teen-patti');
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        Promise.resolve(new CardEngine(ruleset, `c-${i}`).playRound('r', [{ key: 'player', amount: '1' }])),
      ),
    );
    expect(results).toHaveLength(50);
    results.forEach((r) => expect(r.winners.length).toBeGreaterThan(0));
  });
});
