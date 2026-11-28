# Basic Store Architecture Refactor

> **Status**: Deferred proposal. Follow current ownership until a scoped refactor is approved.

## Current Pressure

`store/basic/gameStore.ts` owns several coupled basic concerns:

- live scoring, possession, events, point lines, and entry signals
- game, halftime, timeout, and point timers
- basic format/configuration state

The large persist projection makes ownership changes and hydration behavior expensive to reason
about. This is real technical debt, but a broad store split is not automatically safer than the
current tested compound actions.

## Existing Boundaries to Preserve

Before introducing a new store, use the boundaries that already exist:

- advanced live games → `store/advancedTracking/trackingStore.ts`
- advanced saved games → `store/advancedTracking/savedGamesStore.ts` and SQLite
- basic saved games → `store/basic/savedGamesStore.ts` and SQLite
- active game mode → `store/gameSessionStore.ts`
- tournaments and game links → `store/tournamentStore.ts`
- app preferences → `store/settingsStore.ts`
- line presets → `store/linePresetsStore.ts`
- teams and rosters → `store/teamStore.ts`

## Decision Rules

- Extract one ownership boundary at a time.
- Keep tightly coupled score/event/undo/timer mutations together unless tests demonstrate a clean
  boundary.
- Do not copy state between old and new stores as a long-term synchronization mechanism.
- Preserve the current-record pointer pattern for domains that need a loaded active record.
- Add an explicit persisted-state migration before removing fields from the basic store snapshot.
- Await persistence before clearing or navigating away from saved state.
- Reuse established Zustand, Immer, AsyncStorage, and SQLite patterns already present in the
  repository.

## Suggested Order

1. Reassess what remains before proposing config or timer stores.
2. Remove `usePlayerStatsStore` only when route/data access can replace it without copying another
   navigation context.

## Verification Required

Any extraction must cover:

- persisted-state migration and hydration failure
- active basic-game recovery
- save/import/delete behavior
- undo and pending-goal cancellation
- team and roster editing from both modes
- route gating through `useGameSessionStore`

Avoid planning from field counts alone; use current consumers and compound-action tests to choose
the boundary.
