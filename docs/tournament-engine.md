# Enterprise Tournament, Competition, Leaderboard & Rewards — Architecture

A complete competitive layer over the platform: tournaments (every common
format), leaderboards, seasons, missions, achievements, XP/levels and rewards.
It integrates with the **Wallet Engine** (entry fees + prize payouts), **Runtime
SDK** (gameplay events feed missions/leaderboards), **Authentication** and the
**Admin Console**.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend: Tournaments · Bracket · Leaderboards · Rewards/Missions   │
│  Admin: Builder · Lifecycle · Leaderboard/Mission/Achievement/Season │
├────────────────────────────────────────────────────────────────────┤
│  TournamentGateway (Socket.IO /tournament)                           │
│    tournament:update · tournament:bracket · tournament:leaderboard   │
├────────────────────────────────────────────────────────────────────┤
│  Backend services                                                    │
│   TournamentService  Leaderboard  Reward  Mission  Achievement Season│
│        │                  │          │        │          │       │   │
│        └── Wallet Engine (entry debit + prize credit) ──┘           │
├────────────────────────────────────────────────────────────────────┤
│  @gaming-platform/tournament-core (pure, deterministic, tested)      │
│   brackets (single/double elim, round-robin, swiss, knockout) ·      │
│   seeding · exact prize distribution · ranking · missions/XP ·       │
│   lifecycle state machine · TournamentEngine aggregate (+ hydrate)   │
├────────────────────────────────────────────────────────────────────┤
│  Persistence: ApplicationSetting (tournament/mission/season configs) │
│   · Leaderboard/LeaderboardEntry · Achievement/UserAchievement ·     │
│   · Reward/RewardClaim · Redis (live ranks, mission progress, XP)    │
└────────────────────────────────────────────────────────────────────┘
```

The **tournament-core** package holds all algorithmic logic and is unit-tested in
isolation (17 tests incl. a 1024-player bracket with an exact 512-way payout).
The backend mirrors its decisions onto persistence, Redis, Socket.IO and the
Wallet Engine. Tournaments, missions and seasons are **configuration** (stored in
`ApplicationSetting`) — adding one is data, not code.

## Data flow

1. Admin **builds** a tournament (format, capacity, entry fee, prize config) → stored.
2. Admin **opens registration** → players **register** (entry fee debited via the Wallet Engine) → join (or waitlist past capacity).
3. Admin **starts** → `TournamentEngine` seeds and generates the bracket → broadcast.
4. Match results are **reported** → the engine advances winners (and losers in double-elim) → bracket broadcast.
5. Admin **completes** → engine ranks standings and computes an **exact** prize split → each award is credited via the Wallet Engine → broadcast.
6. Gameplay events advance **missions** (XP/levels) and **leaderboards** in real time.

## Sequence: paid tournament

```
Player        TournamentService     WalletBridge        Engine        Gateway
  │  register  →  │                     │                 │             │
  │              │  settleImmediate(fee)→│ (reserve+commit)│             │
  │              │  engine.register ─────────────────────→ │             │
  │              │  save · emit ─────────────────────────────────────→  │
  │              │                                                       │
Admin start  →  │  engine.start ───────────────────────→ bracket        │
  │              │  save · emit bracket ────────────────────────────→   │
Admin report →  │  engine.reportMatch ─────────────────→ advance        │
  │              │  emit bracket ───────────────────────────────────→   │
Admin complete→ │  engine.complete ────────────────────→ awards (exact) │
  │              │  for each award: settleImmediate(win) →│ (ledgered)   │
  │              │  emit completed ─────────────────────────────────→   │
```

## Tournament lifecycle

`draft → scheduled → registration → checkin → live → completed`, plus `cancelled`
from any non-terminal state. Enforced by `TournamentLifecycle` (illegal
transitions throw). Cancellation refunds entry fees through the Wallet Engine.

## Leaderboard lifecycle

`create → submit scores (Redis ZSET + Postgres entries) → recompute dense ranks →
broadcast top-N`. Periods: daily / weekly / monthly / seasonal / all-time;
scopes: global, game-specific.

## Reward flow

`grant (pending claim) → claim`:
- `CASH`/`CASHBACK` → wallet credit (`PROMOTION_REWARD`/`CASHBACK`).
- `BONUS` → bonus wallet grant (with wagering).
- `BADGE`/`POINTS`/virtual → recorded as claimed.
Tournament prizes and mission/achievement rewards both flow through this path.

## Prize distribution (exact)

`winner-take-all`, `top-n`, `percentage`, `fixed`, `even-split`. Pool-based
strategies split with `bigint` arithmetic (via wallet-core `Money`) so awards sum
to the pool **to the last minor unit**; ties share their combined position prize;
any rounding remainder goes to first place. Dynamic/overlay pools = guaranteed +
share × entry fees.

## Formats

Single & double elimination (2n−2 matches, losers bracket + grand final),
round-robin (circle method), Swiss (score pairing without rematches), knockout,
timed and pure leaderboard tournaments — all from one engine by configuration.

## API reference

**Public / player** (`/tournaments`)
- `GET /` · `GET /:id` — list / detail (bracket, participants, standings, awards)
- `POST /:id/register` · `/:id/checkin` · `/:id/withdraw`
- `GET /leaderboards/list` · `GET /leaderboards/:id/top`
- `GET /me/missions` · `/me/achievements` · `/me/rewards` · `POST /me/rewards/:claimId/claim`
- `GET /rewards/catalog` · `GET /seasons/list` · `GET /seasons/current`

**Admin** (`/admin/tournaments`, RBAC `games:read`/`games:write`)
- `GET /statistics`
- `POST /` · `PUT /:id` · `POST /:id/open|start|report|complete|cancel`
- `POST /leaderboards` · `POST /leaderboards/submit`
- `GET|POST /missions` · `POST /achievements` · `POST /rewards` · `POST /rewards/grant`
- `POST /seasons`

**Realtime** (`/tournament` Socket.IO): `tournament:update`, `tournament:bracket`,
`tournament:leaderboard`, `tournament:feed`.

All endpoints are documented in Swagger (`@ApiTags`/`@ApiOperation`/`@ApiBearerAuth`).

## Testing

`tournament-core`: seeding/brackets, elimination play-out, lifecycle, exact prize
sums (winner-take-all/percentage/even-split/dynamic), ranking ties, missions,
streaks, XP/levels, and a 1024-player load test. Backend: tournament+prize
semantics and state hydration. All run under `pnpm test`.
