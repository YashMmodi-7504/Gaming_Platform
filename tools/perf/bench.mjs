/**
 * Release Candidate 1 — in-process performance & load harness.
 *
 * Drives the platform's pure engine cores at production volumes (1k–10k concurrent
 * operations) and reports throughput and latency percentiles. Runs with no DB /
 * Redis / network, so it is reproducible in CI and on a laptop.
 *
 *   node tools/perf/bench.mjs
 *
 * Requires the core packages to be built (`pnpm -r --filter "./packages/*" build`).
 */
import { WalletLedgerEngine, Money } from '../../packages/wallet-core/dist/index.js';
import { TournamentEngine, awardsTotal } from '../../packages/tournament-core/dist/index.js';
import { MetricRegistry, Histogram } from '../../packages/ops-core/dist/index.js';
import { recommend, FraudRules, parseQuery } from '../../packages/ai-core/dist/index.js';
import { performance } from 'node:perf_hooks';

const results = [];

function bench(name, iterations, fn) {
  // Warm-up.
  for (let i = 0; i < Math.min(1000, iterations); i += 1) fn(i);
  const latencies = new Float64Array(Math.min(iterations, 20000));
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now();
    fn(i);
    if (i < latencies.length) latencies[i] = performance.now() - t0;
  }
  const totalMs = performance.now() - start;
  const sorted = Array.from(latencies.slice(0, Math.min(iterations, latencies.length))).sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
  const row = {
    scenario: name,
    ops: iterations,
    totalMs: Number(totalMs.toFixed(1)),
    opsPerSec: Math.round(iterations / (totalMs / 1000)),
    p50ms: Number(pct(50).toFixed(4)),
    p95ms: Number(pct(95).toFixed(4)),
    p99ms: Number(pct(99).toFixed(4)),
  };
  results.push(row);
  return row;
}

// 1. Wallet — 10k concurrent reserve/commit settlements.
{
  const wallet = new WalletLedgerEngine();
  for (let i = 0; i < 100; i += 1) wallet.open(`w${i}`, '100000');
  bench('wallet.reserve+commit (settlement)', 10000, (i) => {
    const w = `w${i % 100}`;
    const r = wallet.reserve(w, '5', `bet-${i}`, `r-${i}`);
    wallet.commit(r, `${i % 12}`, `c-${i}`);
  });
  if (!wallet.isConserved()) throw new Error('wallet not conserved');
}

// 2. Tournament — bracket generation + exact prize distribution.
bench('tournament 1024-player bracket + payout', 200, () => {
  const engine = new TournamentEngine({
    format: 'single-elimination',
    capacity: 2048,
    entryFee: '5',
    prize: { type: 'percentage', currencyId: 'c', guaranteed: '0', entryContribution: 1, tiers: [{ fromRank: 1, toRank: 1, value: 0.5 }, { fromRank: 2, toRank: 512, value: 0.5 }] },
  });
  for (let i = 0; i < 1024; i += 1) engine.register({ id: `p${i}`, userId: `u${i}`, displayName: `P${i}`, rating: 1024 - i });
  engine.start({ byRating: true });
  let guard = 0;
  for (;;) {
    const ready = engine.bracket.matches.find((m) => m.state === 'ready');
    if (!ready) break;
    engine.reportMatch(ready.id, ready.slots[0].participantId);
    if ((guard += 1) > 5000) break;
  }
  const { pool, awards } = engine.complete();
  if (awardsTotal(awards) !== pool) throw new Error('payout mismatch');
});

// 3. Ops metrics — 100k histogram observations + percentile compute.
bench('ops metrics observe (100k samples each)', 200, () => {
  const h = new Histogram(4096);
  for (let i = 0; i < 100000; i += 1) h.observe(i % 1000);
  h.snapshot();
});
// Dashboard snapshot path (percentiles) — full 4096-sample histogram.
{
  const h = new Histogram(4096);
  for (let i = 0; i < 4096; i += 1) h.observe((i * 31) % 1000);
  bench('ops histogram.snapshot (4096 samples)', 20000, () => h.snapshot());
}
bench('ops registry recordHttp', 50000, (i) => {
  const reg = globalThis.__reg ?? (globalThis.__reg = new MetricRegistry());
  reg.inc('http_requests_total', { route: '/x' });
  reg.observe('http_request_duration_ms', i % 100, { route: '/x' });
});

// 4. AI — recommendation scoring over a 500-game catalog.
{
  const catalog = Array.from({ length: 500 }, (_, i) => ({
    id: `g${i}`,
    text: `${['card', 'dice', 'crash', 'roulette'][i % 4]} game ${i} ${i % 3 ? 'high-rtp' : 'standard'}`,
    popularity: (i * 37) % 100,
    recency: (i % 10) / 10,
  }));
  bench('ai.recommend (500-game catalog)', 5000, (i) => {
    recommend(catalog, { history: [`g${i % 500}`, `g${(i + 7) % 500}`] }, { limit: 12 });
  });
}

// 5. AI — fraud assessment + NL search parse.
bench('ai.fraud.assess', 50000, (i) =>
  FraudRules.assess({
    accountId: `a${i}`, sharedDeviceAccounts: i % 5 ? [] : ['b', 'c'], sharedIpAccounts: [], distinctDevices: 1,
    distinctIpsLastHour: i % 7, betsLastMinute: i % 100, winRate: (i % 100) / 100, roundsPlayed: 120,
    depositsLastHour: i % 5, actionIntervalStdDevMs: 200 + (i % 500), withdrawalRatio: 0.3,
  }),
);
bench('ai.search.parseQuery', 50000, (i) => parseQuery(['show me card games', 'highest rtp games', 'tournaments today', 'players with suspicious activity'][i % 4]));

// Report.
const pad = (s, n) => String(s).padEnd(n);
console.log('\nRC1 PERFORMANCE / LOAD BENCHMARK (in-process, deterministic)\n');
console.log(pad('scenario', 44), pad('ops', 8), pad('ops/sec', 12), pad('p50ms', 10), pad('p95ms', 10), 'p99ms');
console.log('-'.repeat(100));
for (const r of results) {
  console.log(pad(r.scenario, 44), pad(r.ops, 8), pad(r.opsPerSec, 12), pad(r.p50ms, 10), pad(r.p95ms, 10), r.p99ms);
}
console.log('\nJSON:', JSON.stringify(results));
void Money;
