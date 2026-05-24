# Basic Games SQLite Migration

> **Status**: Thought exercise / Future feature

## Overview

Basic saved games currently live inside `useGameStore` as a persisted Zustand array:
`savedGames: SavedGame[]`. Advanced tracked games already use SQLite via
`lib/advancedTracking/storage.ts`, with a summary table for list views and a JSON
record table for full game data.

Migrating basic games to SQLite would mainly be a storage-layer refactor. The goal
would be to remove saved-game history from the large persisted `gameStore` payload
while preserving the existing `SavedGame` model, analytics utilities, sharing
format, and import/export behavior.

## Recommended Shape

Use the same hybrid approach as advanced tracking:

- `basic_game_summaries`: small, queryable rows for saved-game lists.
- `basic_game_records`: full `SavedGame` JSON records keyed by game id.

The full JSON record should remain canonical at first. Do not normalize events,
players, point lines, or timestamps into separate SQL tables unless a concrete
feature needs SQL-level querying across those fields.

### Summary Table Fields

Likely summary columns:

- `id`
- `schema_version`
- `created_at`
- `played_at`
- `sort_timestamp`
- `imported_at`
- `tournament_id`
- `team1_id`
- `team1_name`
- `team2_name`
- `team1_score`
- `team2_score`
- `points_tracked`
- `updated_at`

### Record Table Fields

Likely record columns:

- `id`
- `schema_version`
- `updated_at`
- `data_json`

## Implementation Plan

### 1. Add Basic Game SQLite Storage

Create a storage module, likely `lib/basicGames/storage.ts`, modeled after
`lib/advancedTracking/storage.ts`.

Expected API:

```typescript
loadBasicGameSummaries(): Promise<BasicGameSummary[]>
loadBasicGame(gameId: string): Promise<SavedGame | null>
loadBasicGames(gameIds: string[]): Promise<SavedGame[]>
upsertBasicGame(game: SavedGame): Promise<BasicGameSummary>
deleteBasicGameRecord(gameId: string): Promise<void>
deleteBasicGameRecords(gameIds: string[]): Promise<void>
```

Use a queued write helper like advanced tracking to avoid overlapping SQLite
transactions.

### 2. Add Summary Derivation

Add a basic-game summary type and derivation helper, similar to
`deriveAdvancedGameSummary(...)`.

The summary should use existing helpers where practical:

- `getGameDisplayTimestamp(game)` for display/sort date behavior.
- `resolveTeamName(...)` only at the UI boundary if team names should reflect
  renamed saved teams.
- `game.events.filter((event) => event.type === 'goal').length` for
  `pointsTracked`, matching `basicGameToListItem(...)`.

### 3. Split Live Game State From Saved History

`gameStore` should keep the current live basic game state in Zustand, but saved
game history should move out of the persisted store.

Likely state after migration:

- keep live scoreboard/gameplay fields in `useGameStore`
- keep `currentGameId` in `useGameStore`
- keep `savedGameSummaries` in memory for list counts and saved-game browsing
- load full saved games from SQLite on demand
- keep `savedTeams` in `useGameStore` unless/until teams are migrated separately

This mirrors advanced tracking's split between `currentGame`, `currentGameId`,
`savedGameSummaries`, and SQLite-backed record loading.

### 4. Update Store Actions

Actions that currently mutate `savedGames` would become SQLite-backed:

- `saveCurrentGame()`: upsert the full game record and update summary state.
- `deleteSavedGame(id)`: delete from SQLite and summary state.
- `deleteSavedGames(ids)`: bulk delete from SQLite and summary state.
- `updateSavedGameEvent(...)`: load the full record, update, upsert.
- `deleteSavedGameEvent(...)`: load the full record, update, upsert.
- `updateSavedGamePlayedAt(...)`: load the full record, update, upsert.
- `updateSavedGameTournament(...)`: load the full record, update, upsert.
- `clearTournamentFromGames(...)`: update matching records and summaries.
- `importGame(...)`: migrate, upsert, update summary state.

Because several of these actions are already async, the call sites should be able
to adapt without changing the user-facing flow too much.

### 5. Add Query Hooks

Add hooks equivalent to `hooks/advancedTracking/useAdvancedGameQueries.ts`:

```typescript
useBasicGame(gameId: string | undefined)
useBasicGames(gameIds: string[])
```

These would let detail, aggregate, sharing, and edit screens load full records
without assuming every saved game is already in memory.

### 6. Update Direct Consumers

Screens and utilities that currently read `savedGames` directly would need review.
Likely touch points:

- `app/(main)/(hub)/(analytics)/ViewStats.tsx`
- `app/(main)/(hub)/(analytics)/SavedGameStats.tsx`
- `app/(main)/(hub)/(analytics)/AggregateStats.tsx`
- `app/(main)/(hub)/(analytics)/saved-games/[gameId].tsx`
- `app/(main)/(hub)/(analytics)/GameTimeline.tsx`
- `app/(main)/Import.tsx`
- `components/view-stats/SavedGamesList.tsx`
- `components/view-stats/AggregateGamesList.tsx`
- sharing/export flows that serialize selected saved games

List screens should use summaries. Detail, aggregate, timeline, sharing, and event
editing flows should load full records by id.

## Production Migration

Because the app has been in production, existing games must be migrated from the
current AsyncStorage-backed Zustand payload.

Recommended rollout:

1. On app startup after `gameStore` rehydrates, read existing `state.savedGames`.
2. Run `migrateSavedGames(...)` so older schema versions are normalized first.
3. Bulk upsert migrated games into SQLite.
4. Write a migration marker such as `basicGamesSqliteMigratedAt` or
   `basicGamesStorageVersion`.
5. Keep the old `savedGames` payload for at least one release as a fallback.
6. In a later release, clear `savedGames` from the persisted Zustand payload once
   the migration has proven stable.

The migration should be idempotent. Since games have stable ids, `INSERT OR
REPLACE` can safely handle reruns without duplicating records.

### Migration Risks

- Partial migration if the app is closed mid-write.
- Duplicate or stale records if the migration marker is written before all games
  are upserted.
- Old imported games with missing fields or older schema versions.
- Screens briefly showing empty history before SQLite summaries are loaded.
- Any code path that still assumes `savedGames` contains every saved game.

Mitigations:

- Upsert all records first, then write the migration marker.
- Make startup summary loading explicit.
- Keep old `savedGames` as fallback during the first rollout.
- Add tests for migration idempotency and legacy saved-game fixtures.

## Testing Plan

Add focused tests for:

- summary derivation from `SavedGame`
- SQLite upsert/load/delete behavior
- AsyncStorage-to-SQLite migration idempotency
- migration of legacy saved games before SQLite insertion
- event editing after loading a saved game from SQLite
- aggregate stats loading multiple selected games
- sharing selected games after loading records by id
- deleting one and many saved games
- tournament assignment and clearing

Manual QA should include:

- existing production-like saved games appear after upgrade
- saving a newly completed basic game
- undo + re-win does not duplicate the saved game
- editing saved game events
- aggregate stats across multiple games
- sharing/importing games
- deleting selected games
- app restart after migration

## Effort Estimate

Estimated effort: **moderate**, roughly 2-4 focused implementation days plus
about 1 day of QA.

The SQLite storage module itself should be small because advanced tracking already
provides a working pattern. Most effort is in updating screens and store actions
that currently rely on `savedGames` being fully available in memory.

## Is It Worth It?

This is worth doing if:

- users can accumulate many basic saved games
- app startup or Zustand rehydration becomes slow
- the persisted `gameStore` payload is getting too large
- saved-game history needs a cleaner path toward cloud sync
- basic and advanced saved-game storage should behave consistently

If basic game counts are usually small and there are no startup or persistence
issues, this is more of an architecture cleanup than an urgent product need.

Given advanced games already use SQLite, migrating basic games would make the
storage story cleaner and reduce long-term coupling inside `gameStore`, but it
should be scheduled as a careful persistence migration rather than a quick
mechanical refactor.
