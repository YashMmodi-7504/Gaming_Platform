# Enterprise Wallet & Financial Engine — Architecture

The Wallet Engine is the financial backbone of the platform. **Every** balance
movement — deposits, bets, wins, bonuses, transfers, adjustments — flows through
it. No game engine or service mutates balances directly.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  Game Engines (Card · Roulette · Dice · Crash · Sports)           │
│  └─ integrate ONLY via WalletBridgeService                         │
├──────────────────────────────────────────────────────────────────┤
│  WalletBridgeService   reserve → settle → cancel (+ realtime push) │
├──────────────────────────────────────────────────────────────────┤
│  WalletEngineService   atomic, idempotent, optimistically-locked   │
│    ├─ Reservation / Settlement services (game flow)                │
│    ├─ Ledger service      (double-entry posting + reconciliation)  │
│    ├─ Transaction service (append-only history)                    │
│    ├─ Bonus / Reward services                                      │
│    └─ Reporting service   (turnover, RTP, GGR, cash flow)          │
├──────────────────────────────────────────────────────────────────┤
│  @gaming-platform/wallet-core  (pure, exact arithmetic, tested)    │
│    Money(bigint 1e18) · Balance algebra · Ledger builder ·         │
│    Lifecycle state machine · Reservation reducer · Reference engine│
├──────────────────────────────────────────────────────────────────┤
│  Postgres (Prisma)  Wallet · WalletBalance(version) ·             │
│    WalletTransaction(idempotencyKey) · Ledger · LedgerEntry ·      │
│    LockedFunds · BonusWallet · RewardWallet      +  Redis locks    │
└──────────────────────────────────────────────────────────────────┘
```

## The canonical game flow

```
Validate Session → Validate Wallet → Reserve Funds → Start Game →
Game Ends → Commit Result → Ledger Update → Wallet Update → Realtime Balance
```

- **Reserve** moves `available → locked` and opens a `LockedFunds` record.
- **Commit** consumes the locked stake (player → house) and credits any winnings
  (house → player) — both as balanced double-entry journals — in one DB
  transaction.
- **Cancel** returns `locked → available`.
- Stateless rounds (dice/roulette/card) use `settleImmediate` (reserve + commit
  atomically); interactive games (crash) reserve on start and commit on cashout
  or bust; deferred markets (sports) reserve on placement and settle on result.

## Correctness guarantees

| Threat | Mitigation |
| --- | --- |
| Double spending / overdraft | `Balance` algebra rejects any negative component |
| Race conditions | `WalletBalance.version` optimistic lock (`updateMany where version`) |
| Concurrent bets on one wallet | Per-wallet **Redis lock** (ordered acquisition, no deadlock) |
| Duplicate transactions / replay | Unique `idempotencyKey`; replays return the original result |
| Balance corruption (float drift) | All maths in `bigint` at 18 dp (`Money`) — exact |
| Partial writes | Everything inside a single Serializable Prisma `$transaction` |
| Illegal settlements | Transaction & reservation **lifecycle state machines** |

The double-entry invariant `Σ debits = Σ credits` is enforced at write time and
verifiable any time via `GET /admin/wallet/reconcile` (trial balance).

## Wallet types

`MAIN`, `BONUS`, `REWARD`, `LOCKED`, `TOURNAMENT`, `PROMOTIONAL`, `CASH`,
`VIRTUAL` — configurable per user/currency. A per-currency `CASH` **house
wallet** (owned by a system account) is the counterparty for player journals.

## Transaction types & lifecycle

Types: deposit, withdrawal, game bet/win, refund, rollback, adjustment, bonus
credit/debit, referral reward, tournament prize, cashback, promotion reward,
penalty, admin adjustment, transfer in/out, lock/unlock, reserve/reserve-release.

Lifecycle: `PENDING → RESERVED → PROCESSING → COMPLETED/SETTLED`, with
`REVERSED`/`REFUNDED`/`FAILED`/`CANCELLED`/`EXPIRED` terminals — enforced by
`Lifecycle.transition`.

## API surface

- **User** (`/wallet-engine/*`): balances, transactions (filter+paginate),
  transfer, bonus list/convert, reward get/redeem.
- **Admin** (`/admin/wallet/*`): statistics, revenue overview (RTP/GGR), ledger
  reconciliation, per-user wallet & transaction inspection, manual credit/debit,
  freeze/unfreeze, rollback.
- **Realtime** (`/wallet` Socket.IO): `wallet:balances`, `wallet:transaction`,
  `wallet:settlement`.
- Back-compat `/wallet` and `/transactions` routes delegate to the engine.

All endpoints are documented in Swagger (`@ApiTags`, `@ApiOperation`,
`@ApiBearerAuth`).

## Testing

`@gaming-platform/wallet-core` ships exhaustive unit tests: money exactness,
balance algebra, double-entry invariants, lifecycle transitions, reservation
flows, rollback, and a **10,000-operation concurrency stress test** asserting
zero balance corruption (`Σ accounts ≡ 0`, every journal balanced, no negative
balances). The backend adds settlement-semantics specs.

## Adding new financial behaviour

Add a `TransactionTypeCode` (wallet-core) and call the appropriate engine
primitive — the ledger, lifecycle and reporting pick it up automatically. No
schema change or game-engine change is required.
