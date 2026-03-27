# Store Architecture Refactor

> **Status**: Not started — planned refactor, no urgency

## Problem

`gameStore` is a god store with ~224 state fields and actions spanning six distinct concerns:

1. Live game state (scores, possession, events, timeouts, line)
2. Timer state (game clock, halftime break, timeout, point timer — four state variables each)
3. Roster and team management (`currentTeam`, `addPlayer`, `updateRosterPlayer`)
4. Game catalog (`savedGames`, `savedTeams` and all CRUD)
5. Transient UI signals (`pendingStatEntry`, `pendingTurnoverEntry`, `pendingTimeoutModal`, `eventToastSignal`)
6. Game config that survives `resetGame` (`gameTo`, `gameLength`, `floaterEnabled`, etc.)

The `partialize` function is correspondingly massive and hard to reason about. Adding state means deciding whether it belongs in the snapshot, which requires understanding the full shape.

---

## Proposed Store Split

### `gameLibraryStore` — saved game/team catalog

The clearest cut. `savedGames` and `savedTeams` are static CRUD catalog data with no coupling to live game state.

```
savedGames: SavedGame[]
savedTeams: SavedTeam[]
loadSavedGames, saveGame, deleteSavedGame, deleteSavedGames, importGame
loadSavedTeams, saveTeam, deleteTeam, importTeam
```

- Reads and writes via the existing `storage` adapter (`'ultimatestats_games'` / `'ultimatestats_teams'` keys)
- Does not persist via Zustand — the adapter is the source of truth; always load fresh on startup
- `playerStatsStore` is a symptom of this problem: it copies game data into its own state as a navigation-param bag. Once the library store is clean, the stats screen can read from it directly or receive data via route params

### `gameConfigStore` — pre-game settings

Fields that survive `resetGame` — they configure the game but are not part of the live game itself.

```
gameTo / baseGameTo, gameLength, softCapMins
floaterEnabled, autoHalftimeEnabled
team1BgColor, team2BgColor, team2Name
```

- Persisted via Zustand under a new key
- `resetGame` becomes a simple wipe of `liveGameStore` with no field-by-field skip logic

### `timerStore` — all timer state

Three timers (game clock, halftime break, timeout) plus point timer, each with `isActive/endTime/timeLeft` variants. 12+ fields that share behavior (pause/resume, background persistence).

```
// Game clock
timerIsActive, timerEndTime, timerTimeLeft

// Halftime break
isHalftimeBreak, halftimeEndTime, halftimeTimeLeft

// Timeout
pendingTimeoutModal, timeoutEndTime, timeoutTimeLeft

// Point timer
pointTimerEnabled, currentPointStartTime, pointTimerPausedElapsed, pointStartTimestamps
```

### `liveGameStore` — core live game

What remains after the above extractions:

```
team1Score, team2Score
gameHalf, isSoftCap, softCapPending
team1Timeouts, team2Timeouts, team1Floater, team2Floater
possession, startingPossession
events: GameEvent[]
currentPoint
currentLine, pointLines
currentGameId, gameLocked

// Transient UI signals (or move to entryStore if preferred)
pendingStatEntry, pendingTurnoverEntry, pendingTimeoutModal, eventToastSignal
```

Core compound actions (`incrementScore`, `undoLastAction`, `toggleTimeout`, `resetGame`) stay here. They call out to `timerStore.getState()` and `gameConfigStore.getState()` as needed — the same cross-store pattern already used for `useSettingsStore.getState()` in `resetGame`.

---

## Backwards Compatibility

**No risk to saved game data.** There are two storage layers and only one of them is affected by store boundaries:

| Layer                       | Keys                                             | Affected by refactor? |
| --------------------------- | ------------------------------------------------ | --------------------- |
| Storage adapter (canonical) | `'ultimatestats_games'`, `'ultimatestats_teams'` | No                    |
| Zustand persist snapshot    | `'ultimatestats-game-storage'`                   | Yes — shape changes   |

`SavedGame` and `SavedTeam` data models are unchanged. The adapter keys are managed independently of Zustand store names. `loadSavedGames()` always reads fresh from the adapter on startup, so users' saved games survive any store boundary change.

**What will reset on first launch after update:**

- In-progress game state (scores, live events mid-game) — already the reality when partialize shape changes
- Game config defaults (`gameTo`, `gameLength`) — one-time reset to defaults

If preserving in-progress game config is important, Zustand's `migrate` option on the new stores can map fields from the old `'ultimatestats-game-storage'` snapshot.

---

## Priority Order

1. **`gameLibraryStore`** — largest win, cleanest cut, zero atomic action concerns, fixes `playerStatsStore` smell
2. **`gameConfigStore`** — simplifies `resetGame` significantly
3. **`timerStore`** — worthwhile if timer complexity grows (background handling, etc.)
4. **Eliminate `playerStatsStore`** — defer until after (1); library store makes this straightforward

The compound action complexity in `liveGameStore` (`incrementScore`, `undoLastAction`) is inherent to the game logic — not a store architecture problem. It does not need to change.
