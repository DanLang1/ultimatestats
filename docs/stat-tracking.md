# Basic Stat Tracking

> Maintained behavior reference for the lightweight goal, assist, and turnover tracker. Advanced
> pass-by-pass tracking is documented under [features/advanced-tracking/](features/advanced-tracking/README.md).

## Model

Basic tracking appends `GameEvent` records to one chronological array. The canonical union and
invariants are documented in [event-model.md](event-model.md) and defined in
`store/basic/gameStore.types.ts`.

The event stream supports:

- goals and assists
- blocks, throwaways, drops, and split 50/50 turnovers
- timeouts
- optional point numbers and event-relative timing
- replay, editing, analytics, and CSV/PDF export

Do not duplicate the event union in feature documentation. Update `event-model.md` and the exported
types together.

## Ownership

`useGameStore` owns the live basic game, event stream, active team, roster, possession, scores, and
pending entry state.

| State                               | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `statTrackingEnabled`               | Enables attribution and possession-aware controls     |
| `events`                            | Chronological basic event log                         |
| `pendingStatEntry`                  | Opens goal/assist attribution after a tracked goal    |
| `pendingTurnoverEntry`              | Opens turnover attribution                            |
| `possession` / `startingPossession` | Current disc side and halftime reference              |
| `currentLine` / `pointLines`        | Optional player availability and playing-time history |

App-level preferences such as stat-entry order and line calling belong to `useSettingsStore`.

## Goal Flow

1. A valid score action updates the score, appends the goal event, and sets `pendingStatEntry`.
2. `StatEntryOverlay` restricts the picker to the active line when one exists; otherwise it uses the
   active roster.
3. The user records player IDs or explicitly accepts unknown attribution.
4. `addGoalEvent` fills the pending goal event and clears pending state.
5. If the game ended, saving is awaited before the active session is cleared and the post-game flow
   continues.
6. Otherwise the flow may continue to halftime, line selection, or point summary.

## Turnover Flow

The scoreboard action bar is possession-aware. Player-attributed actions open
`TurnoverEntryOverlay`; immediate anonymous actions use the same store mutation path without the
picker.

Cancelling a turnover picker clears pending UI state without adding an event or changing
possession. See [turnover-tracking.md](turnover-tracking.md) for subtype and possession behavior.

## Cancel and Undo

Cancelling goal attribution reverses the pending score and goal event, restores possession, point
number, line history, halftime state, and point-timer state, then clears `pendingStatEntry`.

`undoLastAction` removes the latest basic event and re-derives dependent state. Any change to goal,
turnover, timeout, halftime, line, or timer semantics must cover both normal undo and pending-goal
cancellation.

Selecting an unknown player is not cancellation; it preserves the event with null attribution.

## Reset Behavior

`resetGame()` clears scores, events, pending entry state, possession, timers, point history, and
live line state. It preserves the active team and roster, saved records, and app preferences.
Clearing a roster is a separate explicit action.

## Primary Components

| Area                | Source                                                     |
| ------------------- | ---------------------------------------------------------- |
| Live composition    | `components/basic/scoreboard/LiveScoreboard.tsx`           |
| Goal/assist overlay | `components/basic/stat-entry/StatEntryOverlay.tsx`         |
| Goal/assist content | `components/basic/stat-entry/StatEntryInner.tsx`           |
| Turnover overlay    | `components/basic/turnover-entry/TurnoverEntryOverlay.tsx` |
| Turnover content    | `components/basic/turnover-entry/TurnoverEntryInner.tsx`   |
| Store               | `store/basic/gameStore.ts`                                 |
| Types               | `store/basic/gameStore.types.ts`                           |
| Analytics           | `lib/basic/`                                               |

## Related Screens

- `/PreGameConfirm` configures basic game format and tracking options.
- `/Settings` owns stat-entry order and persistent preferences.
- `/EditRoster` manages the active team's roster.
- `/ViewStats` and related analytics routes consume the event model.
- `/GameTimeline` exposes event, timing, and completed-point lineup corrections.

## Change Checklist

When changing basic stat semantics:

1. Follow existing `store/basic` and `lib/basic` patterns.
2. Update every event producer, undo/cancel path, replay utility, and saved-game editor.
3. Add a schema migration if persisted interpretation changes.
4. Update focused Jest tests and screen coverage.
5. Update [event-model.md](event-model.md), [turnover-tracking.md](turnover-tracking.md), and
   [view-stats.md](view-stats.md) where their behavior changes.
