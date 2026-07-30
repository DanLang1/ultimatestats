# State Ownership Map

Use this map before adding or moving state.

## Rules

- Keep one owner for each domain concept.
- Prefer selectors and derived values over mirrored state.
- Keep transient screen state local unless it must cross a route boundary.
- Cross-store writes should be rare and explicit.
- Await persistence before dismissing, navigating, resetting, or clearing the state being saved.
- Follow existing basic or advanced ownership boundaries before introducing a new store pattern.

## Gameplay and Saved Records

### Basic: `useGameStore`

Source: `store/basic/gameStore.ts` and `store/basic/gameStore.types.ts`.

Owns the basic live game, active team/roster, scores, game format, timers, possession, basic
`GameEvent[]`, pending entry state, point lines, saved basic games, and saved teams.

Advanced code currently reads shared team/roster concepts from this store, but must not place
advanced game state or advanced saved records here. See the proposed ownership cleanup in
`docs/future-features/shared-team-roster-store.md`.

### Advanced Live Game: `useAdvancedTrackingStore`

Source: `store/advancedTracking/trackingStore.ts`.

Owns the loaded `currentGame`, `currentGameId`, live tracker mutations, recent undo operations,
halftime timer state, and recovery pointer. It does not own the saved-game catalog.

### Advanced Saved Games: `useSavedAdvancedGamesStore`

Source: `store/advancedTracking/savedGamesStore.ts`.

Owns saved-game summaries and the in-memory `gamesById` cache. Full records and summaries persist
through `lib/advancedTracking/storage.ts` in SQLite.

### Active Mode: `useGameSessionStore`

Source: `store/gameSessionStore.ts`.

Owns only whether the active session is basic, advanced, or absent. It must not duplicate either
tracker's game state.

## Shared Domain Stores

### `useTournamentStore`

Source: `store/tournamentStore.ts`.

Owns tournaments and links from basic or advanced game IDs to a tournament. Game records do not own
parallel tournament collections.

### `useLinePresetsStore`

Source: `store/linePresetsStore.ts`.

Owns persisted line presets by team and the basic flow's `lineConfirmedForNextPoint` signal.

### `useSettingsStore`

Source: `store/settingsStore.ts`.

Owns persisted app and tracking preferences: orientation, matching colors, gender-ratio defaults,
line selection preferences, cap timing, roster presentation, and stat entry order. Per-game
snapshots belong in the relevant game model instead.

### `useStartupMigrationStore`

Source: `store/startupMigrationStore.ts`.

Owns completion records for one-time startup migrations. It does not own migrated domain data.

## Navigation and UI Stores

### `usePlayerStatsStore`

Source: `store/playerStatsStore.ts`.

Owns transient basic player-stats route context. It is a navigation handoff, not persisted gameplay
state.

### `useNumberPickerStore`

Source: `store/numberPickerStore.ts`.

Owns transient number-picker configuration and callback state for `NumberPickerModal`.

### `useTutorialStore`

Source: `store/tutorialStore.ts`.

Owns persisted onboarding, tutorial, voice, Showcase, and selection-hint flags plus its runtime
hydration gate.

### `useUIStore`

Source: `store/uiStore.ts`.

Owns the basic scoreboard action-bar position and orientation.

## Decision Checklist

- Persisted basic game or team data → `useGameStore`.
- Active advanced capture/editing state → `useAdvancedTrackingStore`.
- Saved advanced record or summary → `useSavedAdvancedGamesStore` and SQLite.
- Cross-mode active-session identity → `useGameSessionStore`.
- Tournament membership → `useTournamentStore`.
- App preference → `useSettingsStore`.
- Reusable team line preset → `useLinePresetsStore`.
- One-screen value → local state.
- Cross-route UI handoff → an existing UI-scoped store, if local state or route params are
  insufficient.
