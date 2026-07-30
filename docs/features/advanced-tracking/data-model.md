# Advanced Tracking Data Model

> Maintained guide to the implemented persisted model. `lib/advancedTracking/types.ts` is the
> authoritative definition. The current schema is `ADVANCED_TRACKING_SCHEMA_VERSION = 2`.

## Shape

```text
AdvancedTrackedGame
  -> sides[]
  -> participants[]
  -> points[]
    -> lines[]
    -> possessions[]
      -> actions[]
    -> transitionsAfter[]
  -> gameTransitions[]
```

The model is point-first and possession-first. Do not flatten advanced actions into the basic
`GameEvent[]` model, dual-write advanced games into basic saved games, or persist derived stat
counters.

## Game

`AdvancedTrackedGame` owns:

- identity, schema, created/updated/imported timestamps
- `gameType`: regular game or scrimmage
- lifecycle `status`: in progress, final, or terminated
- `focusSideId`, which defines the default tracker and analytics perspective
- the opening receiver and optional flip result
- optional metadata, format settings, clock pauses, and initial endzone orientation
- exactly two sides, game-level participants, point history, and game transitions

`settings.locationMode` is `none`, `zone`, or `xy`. Standard format settings may include the game
target, halftime score, cap toggles, timeout count, and floater availability.

`status: 'terminated'` is distinct from a normal final game and may include an `endReason`.

## Sides and Participants

`GameSide` is generic rather than team-one/team-two specific:

- `trackingMode: 'full-roster'` captures player identity.
- `trackingMode: 'anonymous'` intentionally leaves player identity untracked.
- `sourceTeamId` links a side back to a saved app team when applicable.

Participants live once at game scope. A point's `PointLine` assigns participant IDs to sides for
that point, allowing the same participant to appear on different scrimmage sides across the game.

`PlayerRef` preserves three different meanings:

- `participant`: a known tracked player
- `unknown`: identity should have been tracked but was not captured
- `untracked`: identity was intentionally not captured for an anonymous side

Do not collapse `unknown` and `untracked`; analytics and UI use that distinction.

## Points and Possessions

A `TrackedPoint` contains:

- stable point ID
- initial lines by side
- optional injury-sub history
- ordered possessions
- optional between-point transitions after the point
- optional gender ratio
- point-timing and undo-revival timestamps

A `PointPossession` contains a stable ID, the side with possession, and ordered actions. Possession
boundaries are explicit so team efficiency and turnover conversion do not have to reconstruct them
from a game-wide event stream.

The scoring side, score progression, next receiving side, and completed-point state are derived
from action order. They are not parallel persisted counters.

## Actions

`PossessionAction` is the union of:

| Kind          | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `pull`        | Puller, receiver when known, pull result, hang time, and optional location |
| `disc_pickup` | Player establishing possession after a grounded or dead disc               |
| `throw`       | Completion, goal, or turnover result and its player attribution            |
| `stoppage`    | In-point timeout, injury, or manual pause                                  |

Throw results are `complete`, `goal`, `drop`, `throwaway`, `stall`, `block`, `pressure`, and
`callahan`.

Important semantics:

- `toPlayer` is required by behavior for completions and goals, optional for drops, and absent when
  no receiver should be recorded.
- `defender` identifies the tracked defender for blocks, pressures, and Callahans when known.
- `splitAttribution` records the exceptional 50/50 judgment. Normal blame is derived from the throw
  result.
- `recordedAt` is optional so imported or legacy data without action timing remains valid.
- Field locations use a discriminated `zone` or `xy` value and remain optional per action.

## Transitions and Pauses

Use the existing boundary that matches when the event occurs:

- `StoppageAction`: during a possession
- `TrackedPoint.transitionsAfter`: after a point, for team-controlled events such as timeouts
- `AdvancedTrackedGame.gameTransitions`: format-driven halftime, soft-cap, and hard-cap changes
- `AdvancedTrackedGame.gameClockPauses`: whole-game weather, field, administrative, or manual pauses

Halftime is synchronized from score progression, with `triggeredEarly` representing an explicit
early second-half start. Cap transitions are timer-driven rule changes.

## Timing

- `TrackedPoint.startedAt` anchors point-relative timing.
- Action `recordedAt` values produce elapsed action time.
- Stoppage `pausedAt` and `resumedAt` values exclude paused intervals.
- `elapsedMsAtEnd` and `revivedAt` allow an undone scoring action to resume the timer without losing
  prior elapsed time.

Timing fields are optional. Derivations must distinguish missing timing data from zero duration.

## Editing and Undo

Point, possession, action, transition, and participant IDs are stable editing boundaries. Normal
corrections update payload fields without moving historical actions between possessions or points.

The live store keeps a temporary undo stack for recent tracker operations; the undo stack is not
part of the persisted game schema. Persisted data remains the corrected source of truth.

Structural edits must preserve:

- valid side IDs
- valid participant references
- valid point lines
- participant attribution for already-recorded actions
- possession and point ordering

Use the assertions and reconciliation helpers in `lib/advancedTracking/trackingUtils.ts` rather than
introducing a second validation pattern.

## Tracking Modes

- Single-team: focus side is full-roster and the opponent is anonymous.
- Both-team: both sides are full-roster.
- Scrimmage: participants are game-scoped and assigned to a side by each point's line.

The same persisted model supports all three. Branch behavior through tracking-mode and
side-perspective helpers rather than creating parallel schemas.

## Persistence and Migration

Full games are stored as JSON records in SQLite, with separate query-friendly summaries. The live
tracking store owns only the loaded active game and recovery/session state.

When changing the persisted model:

1. Update the exported types and schema version.
2. Add and test migration behavior in `lib/advancedTracking/storage.ts`.
3. Update sharing validation and serialization.
4. Update analytics compilation and downstream stat utilities.
5. Update seeded tests, Maestro fixtures, and this document.

Do not reinterpret an existing field in place when old persisted records would become ambiguous.

## Related Sources

| Concern                        | Source                                       |
| ------------------------------ | -------------------------------------------- |
| Persisted types                | `lib/advancedTracking/types.ts`              |
| Live mutations and undo        | `store/advancedTracking/trackingStore.ts`    |
| Validation and invariants      | `lib/advancedTracking/trackingUtils.ts`      |
| SQLite persistence             | `lib/advancedTracking/storage.ts`            |
| Saved-game cache and summaries | `store/advancedTracking/savedGamesStore.ts`  |
| Analytics compilation          | `lib/advancedTracking/buildAnalyticsGame.ts` |
| Sharing validation             | `lib/sharing/validate.ts`                    |
