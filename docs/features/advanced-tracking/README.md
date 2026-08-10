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

## State and Persistence

- `useAdvancedTrackingStore` owns the active `currentGame`, its `currentGameId`, undo state, and
  live tracker actions.
- The live-store persist snapshot keeps the active-game pointer, timer/session state, and pending
  next-point line selection needed for recovery.
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

When behavior and prose disagree, the exported types and tested implementation are authoritative;
update these documents in the same change.
