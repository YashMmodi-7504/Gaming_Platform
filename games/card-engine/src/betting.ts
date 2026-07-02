import { RuleResolver, RuleValidationError, type CardGameRuleSet } from './rules';

export interface PlacedBet {
  key: string;
  amount: string;
}

export interface BetSettlement {
  key: string;
  amount: string;
  outcome: 'won' | 'lost' | 'push';
  payout: number;
  returned: string;
}

export interface RoundSettlement {
  bets: BetSettlement[];
  totalBet: string;
  totalWin: string;
  net: string;
}

/** Validates placed bets against the ruleset's bet definitions and limits. */
export const BetValidator = {
  validate(ruleset: CardGameRuleSet, bets: PlacedBet[]): PlacedBet[] {
    const allowed = new Set([...ruleset.bets, ...ruleset.sideBets].map((b) => b.key));
    const { min, max } = ruleset.betLimits;
    for (const bet of bets) {
      if (!allowed.has(bet.key)) {
        throw new RuleValidationError(`Bet "${bet.key}" is not allowed for ${ruleset.key}`);
      }
      const amount = Number(bet.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        throw new RuleValidationError(`Bet "${bet.key}" amount must be a positive number`);
      }
      if (amount < min || amount > max) {
        throw new RuleValidationError(`Bet "${bet.key}" must be between ${min} and ${max}`);
      }
    }
    return bets;
  },
};

/** Settles placed bets given the winning and pushed bet keys. */
export const ResultCalculator = {
  settle(
    ruleset: CardGameRuleSet,
    bets: PlacedBet[],
    winningKeys: string[],
    pushKeys: string[] = [],
  ): RoundSettlement {
    const wins = new Set(winningKeys);
    const pushes = new Set(pushKeys);
    let totalBet = 0;
    let totalWin = 0;

    const settled: BetSettlement[] = bets.map((bet) => {
      const amount = Number(bet.amount);
      totalBet += amount;
      if (wins.has(bet.key)) {
        const payout = RuleResolver.payoutFor(ruleset, bet.key);
        const returned = amount * payout;
        totalWin += returned;
        return { key: bet.key, amount: bet.amount, outcome: 'won', payout, returned: returned.toString() };
      }
      if (pushes.has(bet.key)) {
        totalWin += amount;
        return { key: bet.key, amount: bet.amount, outcome: 'push', payout: 1, returned: amount.toString() };
      }
      return { key: bet.key, amount: bet.amount, outcome: 'lost', payout: 0, returned: '0' };
    });

    return {
      bets: settled,
      totalBet: totalBet.toString(),
      totalWin: totalWin.toString(),
      net: (totalWin - totalBet).toString(),
    };
  },
};
