# Games

This directory hosts individual **game modules**. It is intentionally empty in
the foundation phase — no games are implemented yet.

## How games plug in

Each game is a self-contained workspace package that depends on the shared
platform packages and registers itself with the backend and frontend through
well-defined contracts:

- **Types & contracts** — `@gaming-platform/types`
- **Validation & utilities** — `@gaming-platform/shared`
- **UI primitives** — `@gaming-platform/ui`
- **Realtime** — the backend `NotificationsGateway` (`/realtime` namespace)
- **Catalog** — the backend `GamesModule` serves catalog metadata

## Adding a game (later)

A future game module will live at `games/<game-name>/` and be added to the
workspace globs in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml):

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'games/*'
```

Nothing here is built yet by design.
