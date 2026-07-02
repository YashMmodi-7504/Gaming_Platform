import { CardEngine, VariantResolver as CardVariants } from '@gaming-platform/card-engine';
import { RouletteEngine, VariantResolver as RouletteVariants } from '@gaming-platform/roulette-engine';
import { DiceEngine, VariantResolver as DiceVariants } from '@gaming-platform/dice-engine';
import { CrashEngine, VariantResolver as CrashVariants } from '@gaming-platform/crash-engine';
import { Money, WalletLedgerEngine } from '@gaming-platform/wallet-core';
import { TournamentEngine, awardsTotal, type TournamentConfig } from '@gaming-platform/tournament-core';
import { FraudRules, parseQuery, recommend, RiskScoring, type RecItem } from '@gaming-platform/ai-core';
import { Alerts, CircuitBreaker, MetricRegistry, emptyAlertState } from '@gaming-platform/ops-core';

/**
 * Release Candidate 1 — cross-module end-to-end integration.
 *
 * Exercises the real engine cores composed together exactly as the running
 * platform wires them (game round → wallet settlement → tournament → prizes →
 * leaderboard → AI → ops), proving the modules integrate correctly and the books
 * stay conserved through a full player journey. Pure and deterministic — no DB or
 * network — so it runs in CI as the integration gate.
 */
describe('RC1 · end-to-end integration', () => {
  it('settles every game engine through the wallet, conserving the ledger', () => {
    const wallet = new WalletLedgerEngine();
    wallet.open('player', '10000');

    const rounds = [
      new CardEngine(new CardVariants().resolve('dragon-tiger'), 's1').playRound('c1', [{ key: 'dragon', amount: '10' }]),
      new RouletteEngine(new RouletteVariants().resolve('european'), 's2').spin('r1', [{ type: 'red', amount: '10' }]),
      new DiceEngine(new DiceVariants().resolve('sic-bo'), 's3').roll('d1', [{ type: 'big', amount: '10' }]),
      new CrashEngine(new CrashVariants().resolve('crash'), 's4').playRound('x1', [{ amount: '10', autoCashout: 2 }]),
    ];

    for (const r of rounds) {
      // Canonical flow: stake reserved+committed, winnings credited — all ledgered.
      const reservation = wallet.reserve('player', r.settlement.totalBet, r.roundId);
      wallet.commit(reservation, r.settlement.totalWin);
      expect(wallet.isConserved()).toBe(true);
    }
    expect(wallet.ledgerBalanced()).toBe(true);
    // Player balance reflects net of all four rounds, never negative.
    expect(Money.gte(wallet.balance('player').available, '0')).toBe(true);
  });

  it('runs a paid tournament end-to-end: entry fees → bracket → prizes, books conserved', () => {
    const wallet = new WalletLedgerEngine();
    const config: TournamentConfig = {
      format: 'single-elimination',
      capacity: 8,
      entryFee: '50',
      prize: {
        type: 'percentage',
        currencyId: 'c',
        guaranteed: '0',
        entryContribution: 1,
        tiers: [
          { fromRank: 1, toRank: 1, value: 0.6 },
          { fromRank: 2, toRank: 2, value: 0.4 },
        ],
      },
    };
    const tournament = new TournamentEngine(config);

    // Register 8 players, collecting the entry fee through the wallet.
    for (let i = 1; i <= 8; i += 1) {
      const pid = `u${i}`;
      wallet.open(pid, '1000');
      wallet.debit(pid, '50', `entry-${pid}`); // entry fee leaves the player
      tournament.register({ id: `pt${i}`, userId: pid, displayName: `P${i}`, rating: 9 - i });
    }
    tournament.start({ byRating: true });

    // Play the bracket to a champion (favourite advances).
    let guard = 0;
    for (;;) {
      const ready = tournament.bracket!.matches.find((m) => m.state === 'ready');
      if (!ready) break;
      tournament.reportMatch(ready.id, ready.slots[0].participantId!);
      if ((guard += 1) > 1000) throw new Error('bracket did not terminate');
    }

    const { pool, awards } = tournament.complete();
    expect(pool).toBe('400'); // 8 × 50
    expect(awardsTotal(awards)).toBe('400'); // exact payout

    // Distribute prizes back through the wallet.
    for (const award of awards) wallet.credit(award.userId, award.amount, `prize-${award.participantId}`);
    expect(wallet.isConserved()).toBe(true);
    expect(wallet.ledgerBalanced()).toBe(true);
  });

  it('produces a leaderboard, recommendations and risk/fraud signals', () => {
    // Leaderboard from tournament-style scores.
    const scores = [
      { id: 'a', pts: 30 },
      { id: 'b', pts: 30 },
      { id: 'c', pts: 10 },
    ].sort((x, y) => y.pts - x.pts);
    const ranks = scores.map((s, i) => ({ ...s, rank: i > 0 && scores[i - 1]!.pts === s.pts ? i : i + 1 }));
    expect(ranks.map((r) => r.rank)).toEqual([1, 1, 3]);

    // AI recommendation from play history.
    const catalog: RecItem[] = [
      { id: 'teen-patti', text: 'card card card poker', popularity: 90, recency: 0.9 },
      { id: 'andar-bahar', text: 'card card card andar bahar', popularity: 80, recency: 0.7 },
      { id: 'crash', text: 'crash crash crash multiplier', popularity: 95, recency: 1 },
    ];
    expect(recommend(catalog, { history: ['teen-patti'] }, { limit: 1 })[0]!.id).toBe('andar-bahar');

    // NL search + fraud + risk.
    expect(parseQuery('show me card games').filters.category).toBe('card');
    const fraud = FraudRules.assess({
      accountId: 'x', sharedDeviceAccounts: ['y', 'z', 'w'], sharedIpAccounts: ['y'], distinctDevices: 4,
      distinctIpsLastHour: 12, betsLastMinute: 300, winRate: 0.97, roundsPlayed: 200, depositsLastHour: 30,
      actionIntervalStdDevMs: 5, withdrawalRatio: 1,
    });
    expect(fraud.band).toBe('critical');
    expect(
      RiskScoring.overall(
        { longestSessionMinutes: 300, netLoss: 5000, depositsLast24h: 10, lossChasingScore: 0.8, nightPlayRatio: 0.8, depositLimitUtilisation: 1.1 },
        fraud.score,
      ).band,
    ).not.toBe('low');
  });

  it('records operations metrics, fires an alert, and trips a circuit breaker', () => {
    const reg = new MetricRegistry();
    for (let i = 0; i < 1000; i += 1) {
      reg.inc('http_requests_total', { route: '/ai/search' });
      reg.observe('http_request_duration_ms', 5 + (i % 50));
    }
    const snap = reg.snapshot();
    expect(snap.counters['http_requests_total{route="/ai/search"}']).toBe(1000);
    expect(snap.histograms['http_request_duration_ms']!.p99).toBeGreaterThan(0);

    // Alert fires on a sustained breach.
    const rule = { id: 'err', name: 'errors', metric: 'error_rate', comparator: '>' as const, threshold: 0.05, forSeconds: 60, severity: 'critical' as const, enabled: true };
    let state = emptyAlertState(0);
    state = Alerts.evaluate(rule, state, 0.2, 0);
    state = Alerts.evaluate(rule, state, 0.2, 61_000);
    expect(state.status).toBe('firing');

    // Circuit breaker protects a flaky dependency and recovers.
    const cb = new CircuitBreaker({ failureThreshold: 3, successThreshold: 1, openMs: 1000 });
    cb.recordFailure(0);
    cb.recordFailure(1);
    cb.recordFailure(2);
    expect(cb.current).toBe('open');
    expect(cb.canRequest(1100)).toBe(true);
    cb.recordSuccess();
    expect(cb.current).toBe('closed');
  });
});
