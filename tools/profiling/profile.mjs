/**
 * Release Candidate 1 — runtime profiling sampler.
 *
 *   node tools/profiling/profile.mjs
 *
 * Samples event-loop lag, GC pauses, heap growth and CPU while replaying a steady
 * synthetic workload over the engine cores. Emits a JSON profile. For deep flame
 * graphs use the documented external tools (clinic / 0x / --prof) — see
 * docs/release-candidate-1.md.
 */
import { performance, monitorEventLoopDelay, PerformanceObserver, constants } from 'node:perf_hooks';
import { WalletLedgerEngine } from '../../packages/wallet-core/dist/index.js';
import { MetricRegistry } from '../../packages/ops-core/dist/index.js';

const loopDelay = monitorEventLoopDelay({ resolution: 10 });
loopDelay.enable();

let gcPauseMs = 0;
let gcCount = 0;
const gcObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'gc') {
      gcPauseMs += entry.duration;
      gcCount += 1;
    }
  }
});
gcObserver.observe({ entryTypes: ['gc'], buffered: true });

const heapStart = process.memoryUsage().heapUsed;
const cpuStart = process.cpuUsage();
const wall = performance.now();

// Steady workload: 200k wallet settlements + metric records.
const wallet = new WalletLedgerEngine();
for (let i = 0; i < 200; i += 1) wallet.open(`w${i}`, '1000000');
const reg = new MetricRegistry();
const OPS = 200_000;
for (let i = 0; i < OPS; i += 1) {
  const w = `w${i % 200}`;
  const r = wallet.reserve(w, '1', `b${i}`, `r${i}`);
  wallet.commit(r, `${i % 3}`, `c${i}`);
  reg.inc('ops_total');
  reg.observe('op_ms', (i % 7) + 0.5);
}

const wallMs = performance.now() - wall;
const cpu = process.cpuUsage(cpuStart);
const heapEnd = process.memoryUsage().heapUsed;
loopDelay.disable();

const profile = {
  workload: { settlements: OPS, walletsConserved: wallet.isConserved(), ledgerBalanced: wallet.ledgerBalanced() },
  throughputOpsPerSec: Math.round(OPS / (wallMs / 1000)),
  wallMs: Number(wallMs.toFixed(1)),
  cpu: { userMs: Math.round(cpu.user / 1000), systemMs: Math.round(cpu.system / 1000) },
  eventLoop: {
    meanMs: Number((loopDelay.mean / 1e6).toFixed(3)),
    p99Ms: Number((loopDelay.percentile(99) / 1e6).toFixed(3)),
    maxMs: Number((loopDelay.max / 1e6).toFixed(3)),
  },
  gc: { count: gcCount, totalPauseMs: Number(gcPauseMs.toFixed(1)), avgPauseMs: gcCount ? Number((gcPauseMs / gcCount).toFixed(3)) : 0 },
  memory: {
    heapStartMb: Number((heapStart / 1048576).toFixed(1)),
    heapEndMb: Number((heapEnd / 1048576).toFixed(1)),
    heapGrowthMb: Number(((heapEnd - heapStart) / 1048576).toFixed(1)),
    rssMb: Number((process.memoryUsage().rss / 1048576).toFixed(1)),
  },
};

console.log('\nRC1 RUNTIME PROFILE\n');
console.log(JSON.stringify(profile, null, 2));
void constants;
