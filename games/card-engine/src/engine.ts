import { CardSerializer, rankFaceValue, type Card } from './card';
import { type Deck, DeckManager } from './deck';
import { BetValidator, ResultCalculator, type PlacedBet, type RoundSettlement } from './betting';
import { WinnerEvaluator, type RoundOutcome } from './evaluator';
import type { CardGameRuleSet } from './rules';

export interface CardRoundResult {
  roundId: string;
  variant: string;
  mode: string;
  hands: Record<string, string[]>;
  community: string[];
  winners: string[];
  isTie: boolean;
  winningBets: string[];
  pushBets: string[];
  settlement: RoundSettlement;
  details: Record<string, unknown>;
  verification: { seed: string; serverSeedHash?: string; clientSeed?: string; nonce?: number };
}

/** Best blackjack value (aces soften from 11 to 1). */
export function blackjackValue(cards: readonly Card[]): number {
  let total = cards.reduce((sum, c) => sum + rankFaceValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

/**
 * The authoritative card round engine. Constructed with a resolved ruleset and a
 * provably-fair seed, it produces a deterministic, fully-settled round. The same
 * seed always yields the same shoe — enabling replay and verification.
 *
 * The engine is fully data-driven: dealing, evaluation, and settlement are
 * parameterized by the ruleset, never by per-game branches.
 */
export class CardEngine {
  private deck: Deck;

  // Interactive blackjack state (used only by the blackjack strategy).
  private bjPlayer: Card[] = [];
  private bjDealer: Card[] = [];
  private bjBets: PlacedBet[] = [];
  private bjRoundId = '';

  constructor(
    readonly ruleset: CardGameRuleSet,
    private readonly seed: string,
  ) {
    this.deck = this.freshDeck();
  }

  get remaining(): number {
    return this.deck.remaining;
  }

  reshuffle(): void {
    this.deck = this.freshDeck();
  }

  /** Auto-resolve a complete round for non-interactive games. */
  playRound(roundId: string, bets: PlacedBet[]): CardRoundResult {
    BetValidator.validate(this.ruleset, bets);
    if (this.deck.remaining < this.ruleset.playerCount * (this.ruleset.handSize + 1) + 6) {
      this.reshuffle();
    }
    switch (this.ruleset.evaluationMode) {
      case 'side-match':
        return this.playSideMatch(roundId, bets);
      case 'blackjack':
        return this.playBlackjackAuto(roundId, bets);
      default:
        return this.playStandard(roundId, bets);
    }
  }

  // ---- Strategy: standard (poker/high-card/point-total/sum/over-under) -----

  private playStandard(roundId: string, bets: PlacedBet[]): CardRoundResult {
    const r = this.ruleset;
    const hands: Record<string, Card[]> = {};
    const handSize = r.evaluationMode === 'over-under' ? 1 : Math.max(1, r.handSize);
    for (const side of r.sides) {
      hands[side] = this.deck.draw(handSize);
    }
    const community = r.communityCards > 0 ? this.deck.draw(r.communityCards) : [];
    const outcome = WinnerEvaluator.evaluate(r, hands, community);
    const { winningBets, pushBets } = this.mapBets(outcome);
    const settlement = ResultCalculator.settle(r, bets, winningBets, pushBets);
    return this.build(roundId, this.encodeHands(hands), community, outcome, winningBets, pushBets, settlement);
  }

  // ---- Strategy: side-match (Andar Bahar) ----------------------------------

  private playSideMatch(roundId: string, bets: PlacedBet[]): CardRoundResult {
    const r = this.ruleset;
    const [sideA, sideB] = r.sides;
    const a = sideA ?? 'andar';
    const b = sideB ?? 'bahar';
    const reference = this.deck.drawOne();
    const dealt: Record<string, Card[]> = { [a]: [], [b]: [] };
    let winner = a;
    let toggle = 0;
    while (this.deck.remaining > 0) {
      const side = toggle % 2 === 0 ? a : b;
      const card = this.deck.drawOne();
      dealt[side]!.push(card);
      if (card.rank === reference.rank) {
        winner = side;
        break;
      }
      toggle += 1;
    }
    const outcome: RoundOutcome = {
      mode: 'side-match',
      sides: Object.entries(dealt).map(([side, cards]) => ({ side, cards, score: 0, category: 'n/a' })),
      winners: [winner],
      isTie: false,
      details: { reference: reference.rank },
    };
    const settlement = ResultCalculator.settle(r, bets, [winner], []);
    const hands = { reference: CardSerializer.encodeMany([reference]), ...this.encodeHands(dealt) };
    return this.build(roundId, hands, [], outcome, [winner], [], settlement);
  }

  // ---- Strategy: blackjack (auto-resolve) ----------------------------------

  private playBlackjackAuto(roundId: string, bets: PlacedBet[]): CardRoundResult {
    const player = this.deck.draw(2);
    const dealer = this.deck.draw(2);
    while (blackjackValue(player) < 17) player.push(this.deck.drawOne());
    while (blackjackValue(dealer) < this.ruleset.dealerStandValue) dealer.push(this.deck.drawOne());
    return this.settleBlackjack(roundId, bets, player, dealer);
  }

  // ---- Interactive blackjack ----------------------------------------------

  dealBlackjack(roundId: string, bets: PlacedBet[]): { player: string[]; dealerUp: string[] } {
    BetValidator.validate(this.ruleset, bets);
    if (this.deck.remaining < 15) this.reshuffle();
    this.bjRoundId = roundId;
    this.bjBets = bets;
    this.bjPlayer = this.deck.draw(2);
    this.bjDealer = this.deck.draw(2);
    return {
      player: CardSerializer.encodeMany(this.bjPlayer),
      dealerUp: CardSerializer.encodeMany(this.bjDealer.slice(0, 1)),
    };
  }

  blackjackHit(): { player: string[]; value: number; busted: boolean } {
    this.bjPlayer.push(this.deck.drawOne());
    const value = blackjackValue(this.bjPlayer);
    return { player: CardSerializer.encodeMany(this.bjPlayer), value, busted: value > 21 };
  }

  blackjackResolve(): CardRoundResult {
    while (blackjackValue(this.bjDealer) < this.ruleset.dealerStandValue) {
      this.bjDealer.push(this.deck.drawOne());
    }
    return this.settleBlackjack(this.bjRoundId, this.bjBets, this.bjPlayer, this.bjDealer);
  }

  private settleBlackjack(
    roundId: string,
    bets: PlacedBet[],
    player: Card[],
    dealer: Card[],
  ): CardRoundResult {
    const pv = blackjackValue(player);
    const dv = blackjackValue(dealer);
    let winner: string;
    if (pv > 21) winner = 'dealer';
    else if (dv > 21) winner = 'player';
    else if (pv > dv) winner = 'player';
    else if (dv > pv) winner = 'dealer';
    else winner = 'push';

    const winningBets = winner === 'player' ? ['main'] : [];
    const pushBets = winner === 'push' ? ['main'] : [];
    const settlement = ResultCalculator.settle(this.ruleset, bets, winningBets, pushBets);
    const outcome: RoundOutcome = {
      mode: 'blackjack',
      sides: [
        { side: 'player', cards: player, score: pv, category: `value-${pv}` },
        { side: 'dealer', cards: dealer, score: dv, category: `value-${dv}` },
      ],
      winners: winner === 'push' ? ['player', 'dealer'] : [winner],
      isTie: winner === 'push',
      details: { playerValue: pv, dealerValue: dv, winner },
    };
    return this.build(
      roundId,
      { player: CardSerializer.encodeMany(player), dealer: CardSerializer.encodeMany(dealer) },
      [],
      outcome,
      winningBets,
      pushBets,
      settlement,
    );
  }

  // ---- Helpers -------------------------------------------------------------

  private mapBets(outcome: RoundOutcome): { winningBets: string[]; pushBets: string[] } {
    const r = this.ruleset;
    if (outcome.mode === 'over-under') {
      return { winningBets: outcome.winners, pushBets: [] };
    }
    if (outcome.isTie) {
      const hasTieBet = [...r.bets, ...r.sideBets].some((b) => b.key === 'tie');
      if (r.tieRule === 'tie-bet' && hasTieBet) {
        return { winningBets: ['tie'], pushBets: outcome.winners };
      }
      if (r.tieRule === 'split') return { winningBets: outcome.winners, pushBets: [] };
      if (r.tieRule === 'dealer') {
        return { winningBets: outcome.winners.filter((s) => /dealer|banker/.test(s)), pushBets: [] };
      }
      return { winningBets: [], pushBets: outcome.winners };
    }
    return { winningBets: outcome.winners, pushBets: [] };
  }

  private encodeHands(hands: Record<string, Card[]>): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(hands).map(([side, cards]) => [side, CardSerializer.encodeMany(cards)]),
    );
  }

  private build(
    roundId: string,
    hands: Record<string, string[]>,
    community: Card[],
    outcome: RoundOutcome,
    winningBets: string[],
    pushBets: string[],
    settlement: RoundSettlement,
  ): CardRoundResult {
    return {
      roundId,
      variant: this.ruleset.key,
      mode: outcome.mode,
      hands,
      community: CardSerializer.encodeMany(community),
      winners: outcome.winners,
      isTie: outcome.isTie,
      winningBets,
      pushBets,
      settlement,
      details: outcome.details,
      verification: { seed: this.seed },
    };
  }

  private freshDeck(): Deck {
    return DeckManager.fromSeed(this.seed, {
      decks: this.ruleset.decks,
      jokersPerDeck: this.ruleset.jokersPerDeck,
    });
  }
}
