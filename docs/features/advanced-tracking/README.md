# Advanced Tracking

> Maintained architecture map for the implemented advanced tracker.

Advanced tracking is intentionally separate from the basic `SavedGame` and `GameEvent[]` flow. It
supports single-team, both-team, and same-team scrimmage tracking with a point-first data model.

## Architecture

```text
AdvancedTrackedGame
  -> points[]
    -> possessions[]
      -> actions[]

AdvancedTrackedGame
  -> buildAnalyticsGame()
    -> AnalyticsGame
      -> pure stat utilities
        -> analytics UI and exports
```

The persisted model is optimized for capture, editing, and replay. Derived goals, assists,
completions, efficiencies, and visualizations are computed through the analytics layer rather than
stored as parallel counters.

Disc-action capture enters the store through the semantic `recordCaptureIntent` command. Tracker
touch, footer, rare-action, and voice adapters describe coach intent; the store resolves the
current holder/side, timestamps, undo, caps, and canonical pickup/throw actions atomically.
Possession metadata such as Red Zone enters through a dedicated store mutation that resolves the
same canonical possession boundary without creating a parallel counter.

## In-game Help

The tracker's top bar keeps a labeled Help button visible. `TrackerHelpSheet` provides a
“What happened?” reference that always leads with goal, throwaway, and drop gestures, followed
by passes, More, and Undo. Single-team defense adds opponent goal/turnover buttons and player
block capture below the gesture guide; possession never hides the core instructions. Pickup,
dropped-pull, selected-action, paused-play, and between-point hints use the current tracker
state. Help only opens local UI: it does not record actions or change clocks. Users can return
directly to tracking or open the existing practice tutorial.

## State and Persistence

- `useAdvancedTrackingStore` owns the active `currentGame`, its `currentGameId`, undo state, and
  live tracker actions.
- The live-store persist snapshot keeps the active-game pointer, timer/session state, and pending
  next-point line selection needed for recovery. The pending selection owns only the lineups (plus
  its game/after-point context); PullTracking derives receiving/pulling side and gender ratio from
  the current game and settings.
- Partial line drafts remain recoverable while preparing a point. PullTracking accepts only a
  current, ready draft: every full-roster side has exactly seven unique participants, anonymous
  sides are empty, and no participant is unknown or selected on both sides.
- During halftime, line preparation can update that pending selection without ending the break or
  creating the second-half point; the normal start flow still advances through pull tracking.
- `useSavedAdvancedGamesStore` owns saved-game summaries and an in-memory record cache.
- `lib/advancedTracking/storage.ts` persists full advanced games and summaries in SQLite.
- Actions that finalize, import, or otherwise save a game await SQLite persistence before clearing
  or navigating away from the state being saved.

Do not move advanced records into the basic store or introduce a second persisted representation
without a concrete requirement and migration plan.

## Domain Boundaries

- Two generic `sides` replace hard-coded team-one/team-two assumptions.
- `participants` are independent from side assignment so scrimmage players can switch sides by
  point.
- `transitionsAfter` records between-point team-controlled events such as timeouts.
- `gameTransitions` records halftime and cap progression.
- Field location remains optional through `locationMode`.
- Stable point, possession, action, and participant IDs define editing and analytics boundaries.

## Maintained References

- [data-model.md](data-model.md) — persisted domain model and event semantics.
- [analytics-layer.md](analytics-layer.md) — compiled query model produced by
  `buildAnalyticsGame()`.
- [stat-utils.md](stat-utils.md) — pure analytics utilities and derivation conventions.
- [voice-input.md](voice-input.md) — current voice-input behavior and future UX boundaries.

## Roadmap and Follow-up Design

- [Advanced throw classification](../../future-features/advanced-throw-classification.md) —
  optional manual huck/reset tags, derived analytics, and the boundary with location tracking.
- [Advanced red-zone possession tracking](../../future-features/advanced-red-zone-tracking.md) —
  implemented live possession tagging with conversion and pause-adjusted timing analytics.

## Primary Source Folders

| Area                 | Location                                    |
| -------------------- | ------------------------------------------- |
| Routes               | `app/(main)/advancedTracking/`              |
| Tracker UI           | `components/advancedTracking/`              |
| Live hooks           | `hooks/advancedTracking/`                   |
| Domain and analytics | `lib/advancedTracking/`                     |
| Live state           | `store/advancedTracking/trackingStore.ts`   |
| Saved records        | `store/advancedTracking/savedGamesStore.ts` |
| Device workflows     | `.maestro/tests/advanced-tracker-*.yml`     |

Exported types and tests describe current implemented behavior; these maintained documents describe
the intended domain contracts. If they disagree, reconcile the inconsistency and update the
outdated source in the same change.
