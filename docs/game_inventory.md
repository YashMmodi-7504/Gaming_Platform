# Game Inventory — Master Source of Truth

> **Status:** Living document · **Owner:** Platform / Game Studio
> **Scope:** Every game the platform supports, now and on the roadmap.
> **Authority:** This file is the single source of truth and master checklist for
> planning, building, tracking, and signing off every game module.

This document is **planning and tracking only**. It does not change any source
code or architecture. All game names below are generic game *types* (traditional
or descriptive); no copyrighted text, branding, artwork, or assets are used or
reproduced.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Engine Overview](#2-engine-overview)
3. [Complete Game Inventory](#3-complete-game-inventory)
4. [Games Grouped by Engine](#4-games-grouped-by-engine)
5. [Game Rules Documentation](#5-game-rules-documentation)
6. [Development Roadmap](#6-development-roadmap)
7. [Dependency Matrix](#7-dependency-matrix)
8. [Asset Checklist](#8-asset-checklist)
9. [API Checklist](#9-api-checklist)
10. [Testing Checklist](#10-testing-checklist)
11. [Completion Tracker](#11-completion-tracker)
12. [Appendix A — Conventions & Legend](#appendix-a--conventions--legend)
13. [Appendix B — Mapping to Existing Architecture](#appendix-b--mapping-to-existing-architecture)

---

## 1. Project Overview

### 1.1 Purpose of the Game Inventory

The Game Inventory is the authoritative catalog of every game the platform will
ship. It exists to:

- Provide a **stable identifier** (Internal ID + slug) for every game before a
  single line of game code is written.
- Define **which engine** powers each game so engineering effort is shared and
  never duplicated per-title.
- Capture **capabilities** (multiplayer, realtime, wallet, leaderboard, replay,
  etc.) so backend, frontend, QA, and product all share one expectation.
- Act as the **master checklist** that drives the roadmap, sprint planning, and
  the production-readiness sign-off for each title.
- Guarantee the platform can scale to **thousands of games** without redesign —
  every game is metadata + assets + a registered plugin on a shared runtime.

### 1.2 Goals

| # | Goal | Success Criteria |
|---|------|------------------|
| G1 | Single source of truth | Every game has exactly one row in §3 with a unique Internal ID and slug. |
| G2 | Engine reuse | No game ships bespoke runtime plumbing; all run on a registered engine plugin. |
| G3 | Predictable delivery | Every game maps to a roadmap phase (§6) and a completion row (§11). |
| G4 | Zero-redesign scale | Adding a game requires only metadata, assets, and a plugin registration. |
| G5 | Auditable readiness | A game is "Production Ready" only when §9–§11 checklists pass. |

### 1.3 Architecture Overview

The platform is a **Turborepo monorepo** with a data-driven Game Registry and a
reusable Game Runtime & Plugin Engine. Games are **plugins**, not platform code.

```
                       ┌──────────────────────────────────────┐
                       │            Game Registry             │
                       │  (data-driven catalog & metadata)    │
                       └──────────────┬───────────────────────┘
                                      │ resolves launcher + plugin key
                                      ▼
┌───────────────┐   load    ┌──────────────────────┐   hosts   ┌──────────────┐
│  Frontend     │──────────▶│   Game Runtime (SDK)  │──────────▶│ Engine Plugin│
│ Runtime       │  WebSocket│  lifecycle + managers │  sandbox  │ (card/dice/…)│
│ Harness       │◀──────────│  state/events/results │           └──────────────┘
└───────────────┘   events  └──────────┬───────────┘
                                        │ persistence
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                  Wallet / Ledger             Statistics / Replays
```

Key building blocks (already implemented in prior phases):

- **`@gaming-platform/game-sdk`** — runtime, lifecycle, plugin contract, and the
  full manager set (state, events, assets, audio, animation, statistics, replay,
  results, timers, config, localization, theme, storage) plus a deterministic
  provably-fair RNG.
- **Engine plugins** under `games/*` — `card-engine`, `roulette-engine`,
  `dice-engine`, `crash-engine`, `lottery-engine`, `sports-engine`.
- **Game Registry & Catalog** — `Game`, `GameCategory`, `GameProvider`,
  `GameLauncher`, `GameCollection`, assets, tags, versions, configurations.
- **Runtime module** — server-authoritative runtimes, sessions, save-state,
  replay storage, provably-fair seeding, and a realtime WebSocket gateway.

### 1.4 How Games Integrate With the Platform

A new game is introduced through **three data steps only** — no platform code
changes:

1. **Register metadata** — create a `Game` row (slug, name, category, provider,
   age rating, availability, SEO, etc.) and point it at a **launcher** whose
   `key` matches a registered engine plugin (e.g. `dice-engine`).
2. **Upload assets** — attach `GameAsset` records (thumbnail, banner, sprites,
   audio) and any localized variants.
3. **Register the launcher/plugin** — ensure the engine plugin for the game's
   genre is registered in the runtime plugin registry (engines are registered at
   boot; new genres add one registration).

The catalog then surfaces the game; the launcher resolves how to open it; the
runtime hosts the correct engine plugin; the wallet, statistics, and analytics
modules settle and record results automatically.

### 1.5 Game Lifecycle

Every runtime instance follows a strict, validated lifecycle:

```
IDLE → INITIALIZING → LOADING_CONFIG → LOADING_ASSETS → READY
     → STARTING → RUNNING ⇄ PAUSED → STOPPING → STOPPED → DESTROYED
                                   (any state → ERROR → STOPPING/DESTROYED)
```

| Phase | Responsibility |
|-------|----------------|
| INITIALIZING | Plugin attached to host; one-time setup. |
| LOADING_CONFIG | Resolve effective config (defaults + operator/session overrides). |
| LOADING_ASSETS | Preload declared assets; report weighted progress. |
| READY | Fully loaded; awaiting start. |
| RUNNING / PAUSED | Active gameplay; player actions applied authoritatively. |
| STOPPING / STOPPED | Round/series concluded; results finalized. |
| DESTROYED | Resources released (timers, audio, animation, listeners). |

### 1.6 Plugin Architecture

Every engine implements the **common plugin contract**:

`initialize() · loadConfiguration() · loadAssets() · start() · pause() ·
resume() · stop() · destroy() · saveState() · restoreState() · emitEvent() ·
receiveEvent() · recordStatistics() · cleanup()`

Plugins extend `BaseGamePlugin`, which implements the contract in terms of
overridable hooks, so a concrete game only writes genre-specific gameplay. The
runtime sandboxes each plugin to the services granted by its host (RNG, state,
events, results, statistics, replay, timers, assets, audio, animation, storage,
localization, theme, logger) — a plugin never constructs its own infrastructure.

---

## 2. Engine Overview

An **engine** is a reusable, genre-level plugin. Many games share one engine;
each game is a configuration + assets + (optionally) a thin gameplay extension.

| Engine | Plugin Key | Description | Games Supported (themes) | Status |
|--------|-----------|-------------|--------------------------|--------|
| Card Engine | `card-engine` | Deterministic shuffled decks, dealing, and hand evaluation primitives (deck management, draw/discard, blackjack/poker scoring). | Teen Patti family, Poker family, Baccarat, Blackjack, Dragon Tiger, Andar Bahar, 32 Cards, Casino War, Lucky 7, and other card titles. | ✅ Engine live |
| Roulette Engine | `roulette-engine` | Wheel spin + standard bet settlement (straight, splits, colors, odd/even, dozens, columns) with configurable pockets. | Roulette variants, multiplier roulettes, mini/double-ball variants. | ✅ Engine live |
| Dice Engine | `dice-engine` | Seeded multi-dice rolls with over/under/exact settlement and configurable sides/targets. | Sic Bo, Hi-Lo dice, Craps, lucky-dice titles. | ✅ Engine live |
| Crash Engine | `crash-engine` | Provably-fair crash point + rising-multiplier loop with a cash-out window. | Crash, multiplier/rocket titles, trenball-style. | ✅ Engine live |
| Lottery Engine | `lottery-engine` | Pick-K-of-N draws with tiered payouts; deterministic, verifiable draws. | Lottery, Matka, Keno, Bingo, number/race games, lucky draw. | ✅ Engine live |
| Sports Engine | `sports-engine` | Decimal-odds bet placement and single/accumulator settlement against a results feed. | Cricket, football, tennis, racing, esports, and all listed sports. | ✅ Engine live |
| Virtual Sports Engine | `virtual-sports-engine` | RNG-driven simulated fixtures with deterministic outcomes, scheduling, and odds. Builds on Sports + Crash timing primitives. | Virtual cricket/football/racing/tennis. | 🔜 Planned |
| Live Dealer Engine | `live-engine` | Streamed dealer rounds with bet windows; thin over Card/Roulette/Dice settlement + a media/stream channel. | Live versions of card & wheel games. | 🔜 Future |
| Instant / Arcade Engine | `instant-engine` | Single-action instant outcomes (wheel spin, scratch, mines, plinko-style). | Lucky wheel, scratch, mines, ladder. | 🔜 Future |
| Tournament Engine | `tournament-engine` | Cross-game brackets, scoring, and leaderboards layered over any base engine. | Sit-and-go / scheduled tournaments. | 🔜 Future |

**Legend:** ✅ live · 🟡 in progress · 🔜 planned/future.

---

## 3. Complete Game Inventory

Master table of every planned title. Booleans use **Y/N**. See
[Appendix A](#appendix-a--conventions--legend) for column definitions and
codes.

> Abbreviations for the capability columns:
> **SP** Single Player · **MP** Multiplayer · **RT** Realtime · **LB** Leaderboard ·
> **ACH** Achievements · **WAL** Wallet · **TRN** Tournament · **STA** Statistics ·
> **RPL** Replay · **MOB** Mobile · **DSK** Desktop.

| Internal ID | Display Name | Slug | Category | Engine | Game Type | Difficulty | SP | MP | RT | LB | ACH | WAL | TRN | STA | RPL | MOB | DSK | Status | Priority | Complexity | Frontend Module | Backend Module | API Module | Database Tables | Notes |
|-------------|--------------|------|----------|--------|-----------|-----------|----|----|----|----|----|----|----|----|----|----|----|--------|---------|-----------|-----------------|----------------|-----------|-----------------|-------|
| CARD-001 | Teen Patti | teen-patti | Card | card-engine | Comparative card | Medium | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P1 | High | `runtime-harness`, `card-table` | RuntimeModule, GamesModule | `/runtime`, `/games` | games, game_sessions, game_results, player_statistics, game_replays | Flagship table game; multi-seat. |
| CARD-002 | Teen Patti One Day | teen-patti-one-day | Card | card-engine | Two-hand A/B compare | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_runtime_states | Fast bet-on-side variant. |
| CARD-003 | Teen Patti 20-20 | teen-patti-20-20 | Card | card-engine | Fast comparative | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Timed rapid rounds. |
| CARD-004 | Teen Patti Joker | teen-patti-joker | Card | card-engine | Wildcard comparative | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Joker/wild ranking rules. |
| CARD-005 | Teen Patti Muflis | teen-patti-muflis | Card | card-engine | Inverted ranking | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Lowest hand wins. |
| CARD-006 | Poker | poker | Card | card-engine | Community card | Hard | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P1 | High | `runtime-harness`, `card-table` | RuntimeModule | `/runtime` | games, game_sessions, leaderboards | Full hand-rank evaluator. |
| CARD-007 | Poker One Day | poker-one-day | Card | card-engine | Side-bet poker | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Bet-on-board outcome. |
| CARD-008 | Poker 20-20 | poker-20-20 | Card | card-engine | Rapid poker | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Timed format. |
| CARD-009 | Dragon Tiger | dragon-tiger | Card | card-engine | Single-card compare | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_runtime_states | One card per side. |
| CARD-010 | Baccarat | baccarat | Card | card-engine | Point-total compare | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness`, `card-table` | RuntimeModule | `/runtime` | game_results | Player/Banker/Tie + side bets. |
| CARD-011 | Blackjack | blackjack | Card | card-engine | 21 vs dealer | Medium | Y | N | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_runtime_states | Hit/stand/double/split. |
| CARD-012 | Casino War | casino-war | Card | card-engine | High-card duel | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Simple compare + war. |
| CARD-013 | 32 Cards | thirty-two-cards | Card | card-engine | Total-points race | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Four-player point sum. |
| CARD-014 | Andar Bahar | andar-bahar | Card | card-engine | Side-match | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_runtime_states | Match the joker side. |
| CARD-015 | Lucky 7 | lucky-7 | Card | card-engine | Over/under/seven | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Above/below/equal 7. |
| CARD-016 | 3 Card Judgement | three-card-judgement | Card | card-engine | Predict outcome | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Predict ranking. |
| CARD-017 | Queen | queen-cards | Card | card-engine | Court-card race | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Queen draw bets. |
| CARD-018 | Dus Ka Dum | dus-ka-dum | Card | card-engine | Ten-based compare | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Tens ranking. |
| CARD-019 | One Card | one-card | Card | card-engine | Single-card high | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | One-card duel. |
| CARD-020 | Note Number | note-number | Card | card-engine | Number prediction | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Serial/number bet. |
| CARD-021 | Card Hi-Lo | card-hi-lo | Card | card-engine | Higher/lower streak | Easy | Y | N | Y | Y | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results, leaderboards | Streak multiplier. |
| CARD-022 | Three Card Poker | three-card-poker | Card | card-engine | 3-card vs dealer | Medium | Y | N | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Ante/play + pair-plus. |
| CARD-023 | Casino Hold'em | casino-holdem | Card | card-engine | Hold'em vs dealer | Medium | Y | N | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Community + dealer qualify. |
| CARD-024 | Bollywood Cards | bollywood-cards | Card | card-engine | Themed compare | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Themed multi-side bets. |
| ROUL-001 | Roulette | roulette | Table | roulette-engine | European wheel | Medium | Y | Y | Y | N | Y | Y | Y | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness`, `roulette-table` | RuntimeModule | `/runtime` | games, game_results, game_runtime_states | 37-pocket standard. |
| ROUL-002 | Golden Roulette | golden-roulette | Table | roulette-engine | Multiplier wheel | Medium | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Random multiplier pockets. |
| ROUL-003 | Beach Roulette | beach-roulette | Table | roulette-engine | Themed wheel | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Reskin of standard. |
| ROUL-004 | Unique Roulette | unique-roulette | Table | roulette-engine | Custom-rules wheel | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_configurations, game_results | Configurable special bets. |
| ROUL-005 | Mini Roulette | mini-roulette | Table | roulette-engine | 13-pocket wheel | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Reduced pockets. |
| ROUL-006 | Double Ball Roulette | double-ball-roulette | Table | roulette-engine | Two-ball wheel | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Two outcomes per spin. |
| DICE-001 | Sic Bo | sic-bo | Dice | dice-engine | Three-dice betting | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness`, `dice-table` | RuntimeModule | `/runtime` | games, game_results, game_runtime_states | Big/small/totals/triples. |
| DICE-002 | Hi-Lo Dice | hi-lo-dice | Dice | dice-engine | Over/under | Easy | Y | N | Y | Y | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Predict above/below. |
| DICE-003 | Lucky Dice | lucky-dice | Dice | dice-engine | Target roll | Easy | Y | N | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Slider-target bets. |
| DICE-004 | Craps | craps | Dice | dice-engine | Pass-line dice | Hard | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | High | `runtime-harness`, `dice-table` | RuntimeModule | `/runtime` | game_results | Multi-roll pass/come bets. |
| CRSH-001 | Crash | crash | Crash | crash-engine | Rising multiplier | Medium | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P1 | High | `runtime-harness`, `crash-canvas` | RuntimeModule | `/runtime` | games, game_results, game_runtime_states, leaderboards | Realtime cash-out. |
| CRSH-002 | Rocket | rocket | Crash | crash-engine | Multiplier launch | Medium | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P2 | High | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Reskin + auto-cashout. |
| CRSH-003 | Moon | moon-climb | Crash | crash-engine | Climb multiplier | Medium | Y | Y | Y | Y | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Themed crash. |
| CRSH-004 | Trenball | trenball | Crash | crash-engine | Color + crash hybrid | Medium | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Side bets on crash band. |
| LOTT-001 | Lottery | lottery | Lottery | lottery-engine | Pick-K-of-N draw | Easy | Y | Y | N | Y | Y | Y | N | Y | Y | Y | Y | Planned | P1 | Medium | `runtime-harness`, `lottery-board` | RuntimeModule | `/runtime` | games, game_results | Tiered prize draw. |
| LOTT-002 | Matka | matka | Lottery | lottery-engine | Number-draw betting | Medium | Y | Y | N | Y | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Open/close number sets. |
| LOTT-003 | Casino Meter | casino-meter | Lottery | lottery-engine | Meter prediction | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | High/low meter bet. |
| LOTT-004 | Lucky Draw | lucky-draw | Lottery | lottery-engine | Raffle draw | Easy | Y | Y | N | Y | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Ticket raffle. |
| LOTT-005 | Keno | keno | Lottery | lottery-engine | Spot-pick draw | Easy | Y | N | N | Y | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Pick spots, match draw. |
| LOTT-006 | Bingo | bingo | Lottery | lottery-engine | Card-marking draw | Medium | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results, leaderboards | Pattern completion. |
| LOTT-007 | Number Race | number-race | Lottery | lottery-engine | Numbered race | Easy | Y | Y | Y | N | Y | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Bet on race number. |
| LOTT-008 | Lucky Wheel | lucky-wheel | Instant | lottery-engine | Wheel-of-fortune | Easy | Y | N | N | N | Y | Y | N | Y | Y | Y | Y | Planned | P2 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Single-spin reward. |
| SPRT-001 | Cricket | cricket | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P1 | High | `runtime-harness`, `sportsbook` | RuntimeModule | `/runtime` | games, game_results | Pre-match + in-play markets. |
| SPRT-002 | Football (Soccer) | football | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P1 | High | `runtime-harness`, `sportsbook` | RuntimeModule | `/runtime` | game_results | 1X2, totals, handicaps. |
| SPRT-003 | Tennis | tennis | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Set/game markets. |
| SPRT-004 | Table Tennis | table-tennis | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Fast-paced markets. |
| SPRT-005 | Basketball | basketball | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Spreads/totals. |
| SPRT-006 | Baseball | baseball | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Money-line/run-line. |
| SPRT-007 | Golf | golf | Sports | sports-engine | Outright/2-ball | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Tournament outrights. |
| SPRT-008 | Horse Racing | horse-racing | Sports | sports-engine | Race betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P2 | High | `runtime-harness`, `racecard` | RuntimeModule | `/runtime` | game_results | Win/place/each-way. |
| SPRT-009 | Greyhound Racing | greyhound-racing | Sports | sports-engine | Race betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness`, `racecard` | RuntimeModule | `/runtime` | game_results | Win/place. |
| SPRT-010 | Esports | esports | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P2 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Map/match markets. |
| SPRT-011 | Kabaddi | kabaddi | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P3 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Match/handicap markets. |
| SPRT-012 | Badminton | badminton | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P3 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Set markets. |
| SPRT-013 | Volleyball | volleyball | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Set/points. |
| SPRT-014 | Ice Hockey | ice-hockey | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Puck-line/totals. |
| SPRT-015 | Snooker | snooker | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Frame markets. |
| SPRT-016 | Motor Sports | motor-sports | Sports | sports-engine | Race betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Outright/podium. |
| SPRT-017 | Cycling | cycling | Sports | sports-engine | Race betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Stage/GC markets. |
| SPRT-018 | Rugby | rugby | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Handicap/totals. |
| SPRT-019 | Boxing | boxing | Sports | sports-engine | Bout betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Method/round markets. |
| SPRT-020 | Beach Volleyball | beach-volleyball | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Set markets. |
| SPRT-021 | Handball | handball | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Totals/handicap. |
| SPRT-022 | Athletics | athletics | Sports | sports-engine | Event betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Outright winners. |
| SPRT-023 | Wrestling | wrestling | Sports | sports-engine | Bout betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Match markets. |
| SPRT-024 | Chess | chess | Sports | sports-engine | Match betting | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Match/tournament. |
| SPRT-025 | Darts | darts | Sports | sports-engine | Match betting | Easy | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Planned | P4 | Low | `runtime-harness` | RuntimeModule | `/runtime` | game_results | Leg/set markets. |
| VSPT-001 | Virtual Cricket | virtual-cricket | Virtual Sports | virtual-sports-engine | Simulated match | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Future | P4 | High | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_replays | RNG-driven fixtures. |
| VSPT-002 | Virtual Football | virtual-football | Virtual Sports | virtual-sports-engine | Simulated match | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Future | P4 | High | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_replays | Scheduled virtual league. |
| VSPT-003 | Virtual Horse Racing | virtual-horse-racing | Virtual Sports | virtual-sports-engine | Simulated race | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Future | P4 | High | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_replays | Deterministic race sim. |
| VSPT-004 | Virtual Greyhounds | virtual-greyhounds | Virtual Sports | virtual-sports-engine | Simulated race | Medium | Y | N | Y | N | N | Y | N | Y | Y | Y | Y | Future | P4 | Medium | `runtime-harness` | RuntimeModule | `/runtime` | game_results, game_replays | Short-cycle races. |

> **Maintenance rule:** never reuse an Internal ID. When a game is renamed, keep
> the ID and update Display Name/slug, adding a redirect note in §5.

---

## 4. Games Grouped by Engine

Every planned title, grouped by the engine that powers it. Items marked
*(future)* are roadmap candidates beyond the first inventory pass.

### 4.1 Card Engine (`card-engine`)

- Teen Patti
- Teen Patti One Day
- Teen Patti 20-20
- Teen Patti Joker
- Teen Patti Muflis
- Poker
- Poker One Day
- Poker 20-20
- Dragon Tiger
- Baccarat
- Blackjack
- Casino War
- 32 Cards
- Andar Bahar
- Lucky 7
- 3 Card Judgement
- Queen
- Dus Ka Dum
- One Card
- Note Number
- Card Hi-Lo
- Three Card Poker
- Casino Hold'em
- Bollywood Cards
- *(future)* Pai Gow, Red Dog, Pontoon, Side-Bet City, Hand variants

### 4.2 Roulette Engine (`roulette-engine`)

- Roulette (European)
- Golden Roulette (multiplier)
- Beach Roulette (themed)
- Unique Roulette (custom rules)
- Mini Roulette (13 pockets)
- Double Ball Roulette
- *(future)* American Roulette, Lightning-style multiplier, Speed Roulette, Auto Roulette

### 4.3 Dice Engine (`dice-engine`)

- Sic Bo
- Hi-Lo Dice
- Lucky Dice
- Craps
- *(future)* Dice Duel, Chuck-a-Luck, Under/Over 7, Three Dice Poker

### 4.4 Crash Engine (`crash-engine`)

- Crash
- Rocket
- Moon (climb)
- Trenball (color + crash hybrid)
- *(future)* Multiplier ladders, auto-bet/auto-cashout strategy variants, team crash

### 4.5 Lottery Engine (`lottery-engine`)

- Lottery
- Matka
- Casino Meter
- Lucky Draw
- Keno
- Bingo
- Number Race
- Lucky Wheel
- *(future)* Scratch cards, Pick-3 / Pick-4, Powerball-style multi-tier, Daily draw

### 4.6 Sports Engine (`sports-engine`)

- Cricket
- Football (Soccer)
- Tennis
- Table Tennis
- Basketball
- Baseball
- Golf
- Horse Racing
- Greyhound Racing
- Esports
- Kabaddi
- Badminton
- Volleyball
- Ice Hockey
- Snooker
- Motor Sports
- Cycling
- Rugby
- Boxing
- Beach Volleyball
- Handball
- Athletics
- Wrestling
- Chess
- Darts
- *(future)* MMA, Futsal, Field Hockey, Lacrosse, Sailing, Surfing

### 4.7 Virtual Sports Engine (`virtual-sports-engine`) — Planned

- Virtual Cricket
- Virtual Football
- Virtual Horse Racing
- Virtual Greyhounds
- *(future)* Virtual Tennis, Virtual Motor Racing, Virtual Speedway, Virtual Cycling

### 4.8 Future Engines

- **Live Dealer Engine** — live versions of card and wheel games over a media channel.
- **Instant / Arcade Engine** — Mines, Plinko-style, Scratch, Ladder, Hi-Lo arcade.
- **Tournament Engine** — cross-game brackets, scoring, and seasonal leaderboards.

---

## 5. Game Rules Documentation

Each game is documented with a standard **Rule Card**. The fields are fixed so
every card is comparable and complete. Below are full cards for the flagship
title of each engine, followed by a compact rules summary table covering all
remaining titles (so every game is captured).

### 5.0 Rule Card Template

```
Game: <Display Name> (<Internal ID>)
Short Description:   one-sentence summary
Basic Objective:    what the player is trying to achieve
Core Gameplay:      the round flow / decision points
Required Assets:    images, sprites, cards, chips, table, background
Animation:          required animations and transitions
Sound:              SFX and ambience cues
Backend:            settlement, RNG, persistence, services
Frontend:           layout, controls, responsive behavior
Realtime:           WS events, timers, sync, multiplayer needs
Statistics:         metrics recorded per round/session
Achievements:       unlock conditions
Leaderboards:       ranking metric and period
Replay:             what is captured and how it reconstructs
```

### 5.1 Card Engine — Rule Card: Teen Patti (CARD-001)

- **Short Description:** A three-card comparative game where players bet that
  their hand outranks others.
- **Basic Objective:** Hold (or be predicted to hold) the highest-ranking
  three-card hand at showdown.
- **Core Gameplay:** Ante → cards dealt face down → betting rounds (blind/seen,
  chaal, raise, pack/fold, side-show) → showdown → highest hand wins the pot.
- **Required Assets:** 52-card deck sprites, card backs, table felt, chip
  denominations, seat avatars, pot display, thumbnail/banner/background.
- **Animation:** Deal/flip, chip-to-pot, win highlight, fold fade, dealer button
  move, countdown ring.
- **Sound:** Shuffle, deal, chip place, win fanfare, fold, timer tick.
- **Backend:** Deterministic shuffle (seeded RNG), hand-rank evaluation, pot &
  side-pot settlement, wallet debit/credit via ledger, result persistence.
- **Frontend:** Multi-seat table layout, bet controls, blind/seen toggle, action
  buttons, responsive landscape-first with portrait fallback.
- **Realtime:** Seat join/leave, action broadcast, turn timer, showdown reveal,
  reconnect resync, heartbeat/latency.
- **Statistics:** Hands played, win rate, biggest pot, fold rate, average bet.
- **Achievements:** First win, trail (three-of-a-kind), pure sequence, win
  streaks, high-pot wins.
- **Leaderboards:** Net winnings (daily/weekly/all-time), biggest single pot.
- **Replay:** Seed + ordered action frames + reveals; fully reconstructs a hand.

### 5.2 Roulette Engine — Rule Card: Roulette (ROUL-001)

- **Short Description:** Bet on where a ball lands on a 37-pocket wheel.
- **Basic Objective:** Place bets that match the winning pocket/category.
- **Core Gameplay:** Bet window opens → place inside/outside chips → spin →
  pocket resolves → all bets settled by standard payout table.
- **Required Assets:** Wheel, ball, betting layout/felt, chips, number grid,
  history strip, thumbnail/banner/background.
- **Animation:** Wheel spin, ball drop & bounce, chip placement, winning number
  flash, payout sweep.
- **Sound:** Spin whir, ball rattle, win chime, chip clack.
- **Backend:** Seeded pocket draw, multi-bet settlement (straight 35:1 …
  even-money 1:1), wallet settlement, persistence.
- **Frontend:** Bet grid with chip selector, repeat/undo/clear, hot/cold numbers,
  responsive table.
- **Realtime:** Bet window timer, shared spin in multi-seat tables, result push,
  reconnect.
- **Statistics:** Spins played, hit distribution, favorite numbers, net result.
- **Achievements:** First straight-up win, color streaks, full-board coverage.
- **Leaderboards:** Net winnings, biggest single-spin multiplier.
- **Replay:** Seed + bets + pocket result.

### 5.3 Dice Engine — Rule Card: Sic Bo (DICE-001)

- **Short Description:** Bet on the outcome of three dice.
- **Basic Objective:** Predict totals, combinations, or specific triples/doubles.
- **Core Gameplay:** Bet window → place chips on small/big, totals, singles,
  doubles, triples → roll → settle by payout table.
- **Required Assets:** Three dice, dice cup/shaker, betting board, chips, totals
  grid, thumbnail/banner/background.
- **Animation:** Shake, roll & settle, board highlight, payout.
- **Sound:** Shake, dice land, win chime.
- **Backend:** Seeded 3-dice roll, comprehensive bet settlement, wallet,
  persistence.
- **Frontend:** Sic Bo board with all bet zones, chip selector, responsive.
- **Realtime:** Bet timer, shared roll, result push, reconnect.
- **Statistics:** Rolls, total distribution, bet-type win rate.
- **Achievements:** First triple, big/small streaks.
- **Leaderboards:** Net winnings.
- **Replay:** Seed + bets + dice result.

### 5.4 Crash Engine — Rule Card: Crash (CRSH-001)

- **Short Description:** A multiplier rises from 1.00× until it "crashes"; cash
  out before it does.
- **Basic Objective:** Cash out at a multiplier higher than your entry before the
  crash.
- **Core Gameplay:** Place bet in betting phase → multiplier climbs in realtime →
  press cash-out (or auto-cashout) → if you cash out before the crash you win
  stake × multiplier; otherwise you lose the stake.
- **Required Assets:** Multiplier curve canvas, rocket/ascend art, background
  parallax, history bar, thumbnail/banner/background.
- **Animation:** Smooth rising curve (rAF), crash burst, cash-out pop, multiplier
  ticker.
- **Sound:** Rising tone, crash boom, cash-out ding.
- **Backend:** Provably-fair crash point (committed server seed → HMAC), realtime
  tick loop (server-authoritative), wallet settlement, persistence.
- **Frontend:** Live multiplier readout, bet/auto-cashout controls, recent
  multipliers, responsive full-bleed canvas.
- **Realtime:** Tick stream, crash event, cash-out ack, shared rounds, latency
  display, reconnect to in-flight round.
- **Statistics:** Rounds, average cashout, best multiplier, bust rate.
- **Achievements:** Cash out ≥ 2×/10×/100×, win streaks.
- **Leaderboards:** Highest multiplier cashed, net winnings.
- **Replay:** Seed + crash point + tick/cashout frames.

### 5.5 Lottery Engine — Rule Card: Lottery (LOTT-001)

- **Short Description:** Choose numbers; a draw determines tiered prizes by match
  count.
- **Basic Objective:** Match as many drawn numbers as possible.
- **Core Gameplay:** Pick K numbers from a pool of N → draw runs → payout by match
  tier.
- **Required Assets:** Number board/balls, ticket, draw machine, prize table,
  thumbnail/banner/background.
- **Animation:** Ball draw, ticket marking, prize reveal.
- **Sound:** Draw roll, match chime, jackpot fanfare.
- **Backend:** Seeded distinct draw, match counting, tiered payout, wallet,
  persistence.
- **Frontend:** Number picker (quick-pick/manual), ticket summary, draw view.
- **Realtime:** Scheduled draw broadcast (optional), result push.
- **Statistics:** Tickets, match distribution, biggest win.
- **Achievements:** First jackpot, near-miss streaks.
- **Leaderboards:** Net winnings, biggest single win.
- **Replay:** Seed + ticket + draw.

### 5.6 Sports Engine — Rule Card: Cricket (SPRT-001)

- **Short Description:** Bet on cricket match and in-play markets at decimal odds.
- **Basic Objective:** Select outcomes whose combined odds settle as a win.
- **Core Gameplay:** Browse fixtures/markets → place single or accumulator bets →
  markets settle against the results feed → payouts at decimal odds.
- **Required Assets:** Sportsbook UI, team/market iconography, scoreboard widget,
  bet slip, thumbnail/banner/background.
- **Animation:** Odds change flash, bet-slip add/remove, settlement state.
- **Sound:** Odds tick, bet placed, win/lose cues.
- **Backend:** Bet placement validation, accumulator math, settlement against
  results feed, wallet, persistence.
- **Frontend:** Market browser, bet slip (single/accumulator), live odds,
  responsive.
- **Realtime:** Odds updates, in-play push, settlement events.
- **Statistics:** Bets placed, settled, win rate, ROI.
- **Achievements:** First accumulator win, high-odds win.
- **Leaderboards:** Net winnings, biggest accumulator.
- **Replay:** Bet snapshot + results + settlement trail.

### 5.7 Compact Rules Summary — All Remaining Titles

> Columns are condensed; each row still encodes objective, gameplay shape, and
> the core technical requirements. Full Rule Cards are authored per title as the
> game enters Phase planning.

| ID | Game | Objective (1-line) | Gameplay Shape | Realtime | Replay | Key Assets |
|----|------|--------------------|----------------|---------|--------|-----------|
| CARD-002 | Teen Patti One Day | Bet which of two hands is higher | A/B compare | Yes | Yes | Cards, chips |
| CARD-003 | Teen Patti 20-20 | Win rapid comparative rounds | Timed compare | Yes | Yes | Cards, timer |
| CARD-004 | Teen Patti Joker | Highest hand with wildcards | Wild compare | Yes | Yes | Cards, joker art |
| CARD-005 | Teen Patti Muflis | Lowest hand wins | Inverted compare | Yes | Yes | Cards |
| CARD-006 | Poker | Best 5-card hand from hole+community | Community card | Yes | Yes | Cards, table, chips |
| CARD-007 | Poker One Day | Bet on board outcome | Side-bet | Yes | Yes | Cards |
| CARD-008 | Poker 20-20 | Rapid poker rounds | Timed | Yes | Yes | Cards, timer |
| CARD-009 | Dragon Tiger | Higher single card side | One-card compare | Yes | Yes | Cards |
| CARD-010 | Baccarat | Side closest to 9 | Point total | Yes | Yes | Cards, table |
| CARD-011 | Blackjack | Beat dealer to 21 | Hit/stand | Yes | Yes | Cards |
| CARD-012 | Casino War | Higher card / war | High-card | Yes | Yes | Cards |
| CARD-013 | 32 Cards | Highest point total | Point sum | Yes | Yes | Cards |
| CARD-014 | Andar Bahar | Predict matching side | Side-match | Yes | Yes | Cards |
| CARD-015 | Lucky 7 | Above/below/equal 7 | Over-under | Yes | Yes | Cards |
| CARD-016 | 3 Card Judgement | Predict ranking outcome | Prediction | Yes | Yes | Cards |
| CARD-017 | Queen | Court-card draw bets | Draw bet | Yes | Yes | Cards |
| CARD-018 | Dus Ka Dum | Tens-based ranking | Compare | Yes | Yes | Cards |
| CARD-019 | One Card | Single high card | Duel | Yes | Yes | Cards |
| CARD-020 | Note Number | Predict number/serial | Prediction | Yes | Yes | Themed art |
| CARD-021 | Card Hi-Lo | Higher/lower streak | Streak | Yes | Yes | Cards |
| CARD-022 | Three Card Poker | Beat dealer 3-card | Vs dealer | Yes | Yes | Cards |
| CARD-023 | Casino Hold'em | Beat dealer Hold'em | Vs dealer | Yes | Yes | Cards, table |
| CARD-024 | Bollywood Cards | Themed side bets | Multi-side | Yes | Yes | Themed art |
| ROUL-002 | Golden Roulette | Hit multiplier pockets | Multiplier wheel | Yes | Yes | Wheel, FX |
| ROUL-003 | Beach Roulette | Standard roulette themed | Wheel | Yes | Yes | Themed wheel |
| ROUL-004 | Unique Roulette | Custom special bets | Wheel | Yes | Yes | Wheel |
| ROUL-005 | Mini Roulette | 13-pocket roulette | Wheel | Yes | Yes | Wheel |
| ROUL-006 | Double Ball Roulette | Two outcomes per spin | Wheel | Yes | Yes | Wheel, 2 balls |
| DICE-002 | Hi-Lo Dice | Predict over/under | Over-under | Yes | Yes | Dice |
| DICE-003 | Lucky Dice | Hit slider target | Target | Yes | Yes | Dice, slider |
| DICE-004 | Craps | Pass-line dice betting | Multi-roll | Yes | Yes | Dice, table |
| CRSH-002 | Rocket | Cash out before bust | Multiplier | Yes | Yes | Rocket, curve |
| CRSH-003 | Moon | Climb multiplier | Multiplier | Yes | Yes | Curve, theme |
| CRSH-004 | Trenball | Color + crash hybrid | Multiplier+side | Yes | Yes | Curve |
| LOTT-002 | Matka | Number-set betting | Draw | Optional | Yes | Number board |
| LOTT-003 | Casino Meter | Predict meter band | Meter | Yes | Yes | Meter art |
| LOTT-004 | Lucky Draw | Raffle ticket draw | Draw | Optional | Yes | Tickets |
| LOTT-005 | Keno | Match drawn spots | Draw | No | Yes | Number grid |
| LOTT-006 | Bingo | Complete pattern | Marking | Yes | Yes | Cards, balls |
| LOTT-007 | Number Race | Bet on race number | Race | Yes | Yes | Track art |
| LOTT-008 | Lucky Wheel | Single-spin reward | Wheel | No | Yes | Wheel |
| SPRT-002..025 | Sports titles | Match/race betting at odds | Sportsbook | Yes | Yes | Sportsbook UI |
| VSPT-001..004 | Virtual Sports | RNG-simulated fixtures | Simulation | Yes | Yes | Sim renders |

---

## 6. Development Roadmap

Phased delivery. Each game's phase is also reflected in its **Priority** in §3.

### Phase 1 — Core Engines (Foundation) ✅

| Deliverable | Notes |
|-------------|-------|
| Game SDK (runtime, lifecycle, managers, RNG) | Complete |
| Card / Roulette / Dice / Crash / Lottery / Sports engines | Complete (engine primitives) |
| Runtime APIs + WebSocket gateway | Complete |
| Provably-fair seeding, save-state, replay storage | Complete |

### Phase 2 — Primary Games (P1)

Flagship one-per-engine titles to validate the full vertical (engine → wallet →
stats → replay → admin):

- Teen Patti · Dragon Tiger · Baccarat · Blackjack · Andar Bahar (Card)
- Roulette (Table)
- Sic Bo (Dice)
- Crash (Crash)
- Lottery (Lottery)
- Cricket · Football (Sports)

### Phase 3 — Advanced Variants (P2)

Variants and second-tier titles that reuse Phase 2 plumbing:

- Teen Patti One Day/20-20/Joker, Poker family, Card Hi-Lo, Three Card Poker
- Golden Roulette, Mini Roulette
- Hi-Lo Dice
- Rocket, Moon
- Matka, Keno, Lucky Wheel
- Tennis, Basketball, Horse Racing, Esports

### Phase 4 — Sports Expansion (P3–P4)

- Full sports breadth (SPRT-003 … SPRT-025)
- Greyhound/Horse racecards, racecard UI components
- Sportsbook depth: in-play markets, accumulators, cash-out

### Phase 5 — Future Expansion

- Virtual Sports Engine + virtual titles
- Live Dealer Engine
- Instant / Arcade Engine (Mines, Plinko-style, Scratch)
- Tournament Engine + cross-game leaderboards and seasons

---

## 7. Dependency Matrix

How each game flows through the platform's subsystems. Read top-to-bottom: a
**Game** binds to an **Engine**, which is hosted by the **Runtime**, persisted by
**Backend services**, rendered by a **Frontend module**, opened by the
**Launcher**, settled by **Wallet**, measured by **Statistics**, reported by
**Analytics**, and managed by **Admin**.

```
Game
  ↓  (metadata + plugin key)
Engine  (card / roulette / dice / crash / lottery / sports / …)
  ↓  (GameRuntime hosts the plugin)
Runtime + Backend Services  (RuntimeModule, GamesModule, sessions, results, replay)
  ↓
Frontend Module  (runtime-harness, game-canvas, controls)
  ↓
Launcher  (GameLauncher resolves how to open)
  ↓
Wallet  (WalletModule, ledger, deposit/withdraw, settlement)
  ↓
Statistics  (player_statistics, game_statistics)
  ↓
Analytics  (events, revenue/traffic analytics)
  ↓
Admin  (catalog, status/visibility, maintenance, audit)
```

### 7.1 Subsystem Dependency Table

| Layer | Module / Component | Responsibility | Required For |
|-------|--------------------|----------------|--------------|
| Engine | `@gaming-platform/<genre>-engine` | Genre gameplay primitives & settlement | Every game |
| Runtime | `RuntimeModule`, `@gaming-platform/game-sdk` | Lifecycle, sessions, RNG, save-state, replay | Every game |
| Catalog | `GamesModule` | Game registry, categories, providers, collections | Every game |
| Launcher | `GameLauncher` + launcher resolution | How a game is opened (iframe/module/url) | Every game |
| Wallet | `WalletModule`, `TransactionsModule` | Bet debit, win credit, ledger | Real-money games |
| Realtime | `RuntimeGateway` (WebSocket) | Live events, heartbeat, reconnect | RT games |
| Statistics | `player_statistics`, `game_statistics` | Per-player & per-game metrics | STA games |
| Leaderboards | `leaderboards`, `leaderboard_entries` | Rankings | LB games |
| Achievements | `achievements`, `user_achievements` | Unlocks | ACH games |
| Replay | `game_replays`, `game_runtime_states` | Reconstruct sessions | RPL games |
| Notifications | `NotificationsModule` | Wins/alerts/promos | Optional |
| Analytics | `AnalyticsModule` | Revenue/traffic/engagement | All |
| Admin | `AdminModule` | Lifecycle, visibility, maintenance, audit | All |

### 7.2 Per-Game Dependency Flags

| Game (sample) | Engine | Wallet | Realtime | Stats | Leaderboard | Achievements | Replay | Tournament |
|---------------|--------|--------|----------|-------|-------------|--------------|--------|------------|
| Teen Patti | card | Y | Y | Y | Y | Y | Y | Y |
| Roulette | roulette | Y | Y | Y | N | Y | Y | Y |
| Sic Bo | dice | Y | Y | Y | N | Y | Y | N |
| Crash | crash | Y | Y | Y | Y | Y | Y | Y |
| Lottery | lottery | Y | N | Y | Y | Y | Y | N |
| Cricket | sports | Y | Y | Y | N | N | Y | N |

---

## 8. Asset Checklist

Every game requires a complete asset set before it can pass design QA. Use this
checklist per title; mark each item **☐ → ☑** as delivered.

### 8.1 Standard Asset Set (per game)

| Asset | Description | Format (target) | Required |
|-------|-------------|-----------------|----------|
| Thumbnail | Catalog card image | WebP/PNG, 3:4 | Yes |
| Banner | Featured/hero image | WebP/PNG, 16:9 | Yes |
| Background | In-game backdrop | WebP/PNG/animated | Yes |
| Icon | Small square icon | SVG/PNG | Yes |
| Logo | Game wordmark/logo | SVG/PNG | Yes |
| Loading art | Preloader/splash | PNG | Yes |
| Animations | Spritesheets / Lottie / canvas FX | JSON/PNG | Per game |
| Cards | Full deck + backs | SVG/PNG sprites | Card games |
| Chips | Denomination chips | SVG/PNG | Betting games |
| Tables/Boards | Felt, bet layout, board | SVG/PNG | Table games |
| Wheel/Dice/Balls | Genre props | SVG/PNG | Roulette/Dice/Lottery |
| Audio — SFX | Action sounds (deal, spin, win, lose) | OGG/MP3 | Yes |
| Audio — Ambience | Background loop | OGG/MP3 | Optional |
| Effects | Particle/glow/confetti | Canvas/Lottie | Optional |
| Localization | Strings per supported locale | JSON dictionaries | Yes |

### 8.2 Per-Engine Asset Notes

| Engine | Mandatory Extra Assets |
|--------|------------------------|
| Card | Full 52-card deck (+ joker), card backs, dealer button, seat avatars |
| Roulette | Wheel, ball, full bet-grid felt, history strip |
| Dice | 3 dice faces, shaker/cup, bet board |
| Crash | Multiplier curve renderer, ascend art, crash burst FX |
| Lottery | Number balls/grid, draw machine, ticket art, prize table |
| Sports | Sportsbook UI kit, market/scoreboard widgets, bet slip, racecards |

---

## 9. API Checklist

A game may be marked complete only when all required APIs below are implemented,
documented (Swagger), and integration-tested. Most are **already provided by the
platform** and shared across all games (✅); per-game work is metadata + config.

### 9.1 Catalog & Discovery (shared)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /games` | List/search/filter/sort catalog | ✅ Provided |
| `GET /games/:slug` | Game detail | ✅ Provided |
| `GET /games/:slug/launch` | Resolve launch + availability | ✅ Provided |
| `GET /game-categories` | Nested category tree | ✅ Provided |
| `GET /game-providers` | Providers | ✅ Provided |
| `GET /game-collections` | Curated collections | ✅ Provided |
| `POST /favorites/:gameId/toggle` | Favorite toggle | ✅ Provided |
| `POST /recently-played/:gameId` | Record play | ✅ Provided |
| `POST /game-ratings/:gameId` | Rate / review | ✅ Provided |

### 9.2 Runtime (shared)

| Endpoint / Channel | Purpose | Status |
|--------------------|---------|--------|
| `GET /runtime/plugins` | List engine plugins | ✅ Provided |
| `POST /runtime/sessions` | Start a runtime session | ✅ Provided |
| `POST /runtime/sessions/:id/action` | Apply player action (authoritative) | ✅ Provided |
| `GET /runtime/sessions/:id/live-state` | Live state | ✅ Provided |
| `POST /runtime/sessions/:id/state` · `GET …/state` | Save / restore state | ✅ Provided |
| `POST /runtime/sessions/:id/replay` · `GET …/replay` | Store / list replays | ✅ Provided |
| `GET /runtime/sessions/:id/config` | Resolved config | ✅ Provided |
| `POST /runtime/sessions/:id/end` | End + release resources | ✅ Provided |
| `GET /runtime/health` | Runtime health | ✅ Provided |
| `POST /runtime/provably-fair/verify` | Verify fairness | ✅ Provided |
| WS `/runtime` (`join`/`action`/`heartbeat`/`event`) | Realtime transport | ✅ Provided |

### 9.3 Per-Game Required Work (to mark complete)

| Item | Description | Required |
|------|-------------|----------|
| Plugin registered | Engine plugin key resolvable in registry | Yes |
| Game config | `GameConfiguration` entries (bets, payouts, limits) | Yes |
| Launcher bound | `GameLauncher` row with correct key/type | Yes |
| Wallet settlement verified | Bet/win flows through ledger correctly | Real-money |
| Stats wired | `player_statistics` / `game_statistics` updates | STA games |
| Leaderboard wired | `leaderboards` metric + period | LB games |
| Achievements wired | Unlock rules registered | ACH games |
| Swagger updated | Any game-specific endpoint documented | If applicable |

---

## 10. Testing Checklist

A game is **Production Ready** only when every applicable row passes.

| Category | Checks | Applies To |
|----------|--------|-----------|
| Unit Tests | RNG determinism, settlement math, payout tables, edge cases | All |
| Integration Tests | Session create → action → settle → persist | All |
| Gameplay Tests | Full round flow, all bet types, win/lose/void paths | All |
| Realtime Tests | Join/leave, action broadcast, heartbeat, reconnect resync | RT games |
| Performance Tests | Tick loop ≤16ms frame budget, load under N concurrent sessions, memory cleanup | RT/Crash |
| Provably-Fair Tests | Commit/derive/verify, replay reconstructs identical outcome | All |
| Accessibility (AA) | Keyboard controls, focus order, ARIA labels, contrast, reduced motion | All |
| Mobile | Portrait + landscape, touch controls, safe-area, orientation lock where needed | All |
| Desktop | Keyboard shortcuts, large-screen layout, fullscreen | All |
| Cross-Browser | Chromium, Firefox, Safari, mobile Safari/Chrome | All |
| Security | Input validation, session ownership, anti-tamper on results, rate limits | All |
| Wallet Integrity | No double-settle, idempotent results, ledger balances | Real-money |
| Localization | All strings externalized and translated for supported locales | All |
| Replay/QA | Replays play back correctly; admin can review | RPL games |

---

## 11. Completion Tracker

Per-game progress. Update statuses as each lane completes. Legend:
**☐** not started · **◐** in progress · **☑** done · **—** N/A.

| Game | Planning | Design | Backend | Frontend | Engine | Assets | Testing | QA | Production Ready |
|------|:--------:|:------:|:-------:|:--------:|:------:|:------:|:-------:|:--:|:----------------:|
| Teen Patti | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Teen Patti One Day | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Teen Patti 20-20 | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Teen Patti Joker | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Teen Patti Muflis | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Poker | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Poker One Day | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Poker 20-20 | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Dragon Tiger | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Baccarat | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Blackjack | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Casino War | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| 32 Cards | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Andar Bahar | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Lucky 7 | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| 3 Card Judgement | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Queen | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Dus Ka Dum | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| One Card | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Note Number | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Card Hi-Lo | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Three Card Poker | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Casino Hold'em | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Bollywood Cards | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Golden Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Beach Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Unique Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Mini Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Double Ball Roulette | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Sic Bo | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Hi-Lo Dice | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Lucky Dice | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Craps | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Crash | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Rocket | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Moon | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Trenball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Lottery | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Matka | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Casino Meter | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Lucky Draw | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Keno | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Bingo | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Number Race | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Lucky Wheel | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Cricket | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Football (Soccer) | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Tennis | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Table Tennis | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Basketball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Baseball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Golf | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Horse Racing | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Greyhound Racing | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Esports | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Kabaddi | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Badminton | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Volleyball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Ice Hockey | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Snooker | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Motor Sports | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Cycling | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Rugby | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Boxing | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Beach Volleyball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Handball | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Athletics | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Wrestling | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Chess | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Darts | ☑ | ☐ | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | ☐ |
| Virtual Cricket | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Virtual Football | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Virtual Horse Racing | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Virtual Greyhounds | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

> **Note:** "Engine = ☑" reflects that the underlying genre engine already
> exists; the per-game gameplay/config/asset work remains tracked in the other
> lanes.

---

## Appendix A — Conventions & Legend

### A.1 Column Definitions (§3)

| Column | Meaning |
|--------|---------|
| Internal ID | Stable, never-reused identifier (`<ENGINE>-<NNN>`). |
| Display Name | Human-facing name. |
| Slug | URL/route key (kebab-case, unique). |
| Category | Catalog category (Card, Table, Dice, Crash, Lottery, Sports, Virtual Sports, Instant, Live). |
| Engine | Plugin key powering the game. |
| Game Type | Mechanic class (compare, draw, multiplier, betting, etc.). |
| Difficulty | Player complexity (Easy/Medium/Hard). |
| SP/MP | Single / multiplayer support. |
| RT | Realtime (WebSocket-driven). |
| LB/ACH | Leaderboard / Achievements support. |
| WAL/TRN/STA/RPL | Wallet / Tournament / Statistics / Replay support. |
| MOB/DSK | Mobile / Desktop support. |
| Status | Planned / In Progress / Live / Future. |
| Priority | P1 (highest) … P4 (lowest). |
| Complexity | Estimated engineering effort (Low/Medium/High). |
| Frontend/Backend/API Module | Owning modules/components. |
| Database Tables | Primary tables touched. |
| Notes | Free-form context. |

### A.2 Status & Priority Codes

- **Status:** `Planned` · `In Progress` · `Live` · `Future`
- **Priority:** `P1` flagship · `P2` important · `P3` standard · `P4` long-tail/future
- **Complexity:** `Low` (config/reskin) · `Medium` (variant logic) · `High` (new mechanics)

---

## Appendix B — Mapping to Existing Architecture

This inventory is grounded in the already-implemented platform. Quick reference:

| Concept | Where it lives (already built) |
|---------|--------------------------------|
| Engines | `games/card-engine`, `games/roulette-engine`, `games/dice-engine`, `games/crash-engine`, `games/lottery-engine`, `games/sports-engine` |
| Runtime SDK | `packages/game-sdk` (runtime, lifecycle, managers, RNG, plugin contract) |
| Backend runtime | `apps/backend/src/modules/runtime` (sessions, state, replay, gateway, plugin registry, provably-fair) |
| Catalog | `apps/backend/src/modules/games` (+ `GamesModule` controllers/services) |
| Frontend runtime | `apps/frontend/src/components/runtime` (harness, canvas, controls) + `app/(game)/play/[slug]` + `app/(dashboard)/arcade` |
| Database (catalog) | `games`, `game_categories`, `game_providers`, `game_versions`, `game_assets`, `game_tags`, `game_tag_mappings`, `game_configurations`, `game_launchers`, `game_collections`, `game_collection_items` |
| Database (runtime/session) | `game_sessions`, `player_sessions`, `game_results`, `game_runtime_states`, `game_replays` |
| Database (engagement) | `player_statistics`, `game_statistics`, `leaderboards`, `leaderboard_entries`, `achievements`, `user_achievements`, `game_favourites`, `recently_played`, `game_ratings`, `game_reviews` |
| Wallet/settlement | `wallets`, `wallet_balances`, `wallet_transactions`, `ledgers`, `ledger_entries` |

---

*End of document. Keep this inventory updated as the canonical checklist for
every game. Add a row in §3 and §11 before starting any new title; never delete
a row — mark it `Deprecated` instead.*
