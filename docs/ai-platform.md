# Enterprise AI Platform

AI services that power personalization, fraud/risk, smart search and admin
insight across the platform. Built on a pure, deterministic core
(`@gaming-platform/ai-core`) with an optional Claude LLM layer for narration.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend: Discover (recommendations + smart search) ·               │
│  Admin AI (assistant · fraud · risk)                                 │
├────────────────────────────────────────────────────────────────────┤
│  Backend AiModule                                                    │
│   RecommendationService · SearchService · FraudService · RiskService │
│   AnalyticsAiService (admin assistant / reports)                     │
│   PromptManager · LlmService (Claude | local)                        │
├────────────────────────────────────────────────────────────────────┤
│  @gaming-platform/ai-core (pure, deterministic, tested)              │
│   embeddings + cosine · recommend (content + collaborative + pop) ·  │
│   fraud rules · risk + responsible gaming · segmentation + churn ·   │
│   natural-language search parser                                     │
├────────────────────────────────────────────────────────────────────┤
│  Reads: Game catalog · GameSession/Result · Device/LoginHistory ·    │
│  Deposits/Withdrawals · WalletReporting · TournamentService · Alerts │
│  Caches: Redis (catalog embeddings)                                  │
└────────────────────────────────────────────────────────────────────┘
```

The AI layer **reads** existing data and **writes nothing** — it never bypasses
the wallet or any engine. All scoring is deterministic and explainable; the LLM
only narrates grounded facts.

## AI services

| Service | What it does |
| --- | --- |
| Recommendation / Personalization | recommended, similar, trending, recently-played, continue-playing, recommended tournaments, "for you" |
| Smart / NL Search | parses "show me card games", "highest RTP games", "tournaments today", "players with suspicious activity" into typed queries (+ semantic fallback) |
| Fraud Detection | multi-account, account-sharing, device/IP correlation, suspicious betting/wallet, bot detection, impossible win rate, velocity |
| Risk Scoring | 0–100 risk band combining fraud score + behaviour |
| Responsible Gaming | loss-chasing, long sessions, deposit frequency, limit utilisation, night play |
| Segmentation / Churn | RFM segments (VIP…churned) + churn probability + retention action |
| Admin AI Assistant | ask questions, explain revenue, player/tournament/wallet insights, alert & incident summaries, daily report |

## Recommendation method

Each catalog game is embedded from its features (category — repeated to weight
it — name, RTP tier). A player's **taste vector** is the recency-decayed mean of
their played-game vectors. Items are scored as a blend of content similarity
(cosine to taste), normalised popularity and recency. With no history the engine
falls back to popularity/recency. "Similar" is pure content nearest-neighbour;
"trending" blends popularity and recency.

## Fraud detection

Account features (shared device/IP accounts, distinct IPs/hour, bets/minute, win
rate over a sample, deposit velocity, action-interval σ, withdrawal ratio) feed a
weighted rule engine. Each rule emits an explainable `FraudSignal`; the aggregate
is a 0–100 score → `low / medium / high / critical`. The scan endpoint assesses
recently-active accounts and returns the flagged ones, ranked.

## Smart search examples

| Query | Intent |
| --- | --- |
| `show me card games` | games, category=card |
| `highest RTP games` | games, sort=rtp desc |
| `trending crash games` | games, category=crash, trending |
| `tournaments today` | tournaments, today |
| `free tournaments` | tournaments, free entry |
| `players with suspicious activity` | players, fraud scan |

## LLM integration layer

`LlmService` is provider-agnostic:
- **local** (default) — returns the grounded facts assembled from real data; no
  network, fully deterministic, used in tests and when no key is set.
- **anthropic** — set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` (optionally
  `AI_MODEL`, default `claude-sonnet-4-6`); narrates the facts via the Messages
  API with a system prompt that forbids inventing numbers. On any error it falls
  back to the grounded facts.

`PromptManager` holds the answer/report templates; insights are always rendered
from live data so figures are accurate regardless of provider.

## API reference

**Player** (`/ai`)
- `GET /for-you` · `/recommended` · `/recently-played` · `/continue-playing` · `/recommended-tournaments`
- `GET /trending` · `GET /similar/:gameId`
- `POST /search` (NL) · `GET /search/games?q=`

**Admin** (`/admin/ai`, RBAC `analytics:read`)
- `POST /ask` — admin assistant
- `GET /insights/revenue|tournaments|wallet|alerts` · `GET /insights/player/:userId`
- `POST /report`
- `GET /fraud/scan` · `GET /fraud/:userId` · `GET /risk/:userId`

All endpoints are Swagger-documented (`@ApiTags`/`@ApiOperation`/`@ApiBearerAuth`).

## Testing

`ai-core` (16 tests): embeddings & similarity, recommendation ranking (content /
popularity fallback), similar/trending, fraud rule outcomes, risk & RG flags,
segmentation & churn, and NL-search parsing for every documented example.
Backend: prompt rendering (grounded, no leftover placeholders), intent parsing,
recommendation ranking and fraud classification.

## Configuration

| Env | Default | Meaning |
| --- | --- | --- |
| `AI_PROVIDER` | `local` | `local` or `anthropic` |
| `ANTHROPIC_API_KEY` | — | required for the Claude provider |
| `AI_MODEL` | `claude-sonnet-4-6` | Claude model for narration |

No schema changes; embeddings are cached in Redis; everything degrades gracefully
without an LLM key.
