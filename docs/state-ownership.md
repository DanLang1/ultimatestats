# State Ownership Map

Use this file to decide where state should live before implementing a change.

## Rules of Thumb

- Keep one owner per domain concept.
- Derive state in selectors/components when possible instead of duplicating between stores.
- If a field already exists in one store, add actions/selectors there rather than mirroring it elsewhere.
- Cross-store writes should be rare and intentional.

## Store Matrix

### `useGameStore` (`store/gameStore.ts`)

- Owns:
`currentTeam`
`team2Name`
`team1Score`
`team2Score`
`timeouts/floater/game clock state`
`events`
`possession`
`pendingStatEntry`
`pendingTurnoverEntry`
`point timing`
`line state for current game`
`savedGames`
`savedTeams`
- Use for:
Game flow, scoring, roster updates for active team, event creation/editing, save/import/delete game data.
- Do not duplicate in other stores:
Scores, possession, event log, saved game/team records.

### `useSettingsStore` (`store/settingsStore.ts`)

- Owns:
User/game configuration preferences (gender ratio settings, line calling settings, matching-type colors, stat entry order, sidebar collapsed).
- Use for:
Persistent preferences and toggles that are not per-game history.
- Do not duplicate in other stores:
Config toggles or preference values.

### `useLinePresetsStore` (`store/linePresetsStore.ts`)

- Owns:
Preset templates by team, plus `lineConfirmedForNextPoint`.
- Use for:
Creating/editing/reordering reusable line presets.
- Do not duplicate in other stores:
Preset collections.

### `usePlayerStatsStore` (`store/playerStatsStore.ts`)

- Owns:
Navigation/session context for Player Stats view (`playerId`, selected game, provided event/roster context).
- Use for:
Passing player-stats context across screens without persisting gameplay state.
- Do not duplicate in other stores:
Player-stats screen selection context.

### `useNumberPickerStore` (`store/numberPickerStore.ts`)

- Owns:
Transient number picker modal config (`isActive`, bounds, label, callback).
- Use for:
UI control state for `NumberPickerModal`.

### `useTutorialStore` (`store/tutorialStore.ts`)

- Owns:
Onboarding/tutorial completion flags and runtime visibility state.
- Use for:
Tutorial trigger/close/reset behavior.

### `useUIStore` (`store/uiStore.ts`)

- Owns:
Scoreboard action bar position and orientation.
- Use for:
UI placement/orientation state that is not gameplay data.

## Common Decisions

- "Should this persist in saved games?"
If yes, it probably belongs in `useGameStore` or storage schema.
- "Is this just a view preference?"
Put it in `useSettingsStore`.
- "Is this only needed while one modal/screen is open?"
Use a UI-scoped store (`useNumberPickerStore`, `usePlayerStatsStore`) or local component state.

