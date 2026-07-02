/**
 * Release Candidate 1 — HTTP load test (k6).
 *
 * Realistic load against a *deployed* instance (not run in CI — needs a live API).
 *
 *   BASE_URL=https://api.example.com TOKEN=<jwt> \
 *   k6 run --stage 30s:1000 --stage 1m:5000 --stage 1m:10000 tools/load/k6-load.js
 *
 * Stages model 1k → 5k → 10k concurrent virtual users. Thresholds fail the run if
 * latency or error budgets are exceeded, so this doubles as a release gate.
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
const TOKEN = __ENV.TOKEN || '';
const authHeaders = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};

const latency = new Trend('rc1_latency', true);
const errors = new Rate('rc1_errors');

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 5000 },
        { duration: '2m', target: 10000 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<1000'],
    rc1_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

function track(res) {
  latency.add(res.timings.duration);
  errors.add(res.status >= 500);
  return res;
}

export default function () {
  group('catalog & discovery', () => {
    track(check(http.get(`${BASE}/games?limit=20`), { 'games 200': (r) => r.status === 200 }) && http.get(`${BASE}/games?limit=20`));
    track(http.get(`${BASE}/ai/trending`));
    track(http.get(`${BASE}/tournaments?status=registration`));
    track(http.get(`${BASE}/operations/status`));
  });

  group('search & recommendations', () => {
    track(http.post(`${BASE}/ai/search`, JSON.stringify({ query: 'highest rtp card games' }), { headers: { 'Content-Type': 'application/json', ...authHeaders.headers } }));
  });

  if (TOKEN) {
    group('authenticated wallet & play', () => {
      track(http.get(`${BASE}/wallet-engine/balances`, authHeaders));
      track(http.get(`${BASE}/ai/for-you`, authHeaders));
      track(http.get(`${BASE}/wallet-engine/transactions?limit=10`, authHeaders));
    });
  }

  sleep(Math.random() * 1 + 0.5);
}
