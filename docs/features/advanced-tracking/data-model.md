# Advanced Tracking Data Model

> Maintained guide to the implemented persisted model. `lib/advancedTracking/types.ts` is the
> authoritative definition. The current schema is `ADVANCED_TRACKING_SCHEMA_VERSION = 3`.

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
- the side receiving the opening pull and optional flip result
- optional metadata, format settings, clock pauses, and initial endzone orientation
- exactly two sides, game-level participants, point history, and game transitions

`settings.locationMode` is `none`, `zone`, or `xy`. Standard format settings may include the game
target, halftime score, cap toggles, timeout count, and floater availability.

`metadata.notes` stores an optional private game note of up to 1,000 characters. It persists with
the local advanced-game record and can be edited during tracking or from the saved-game analytics
screen. Notes are intentionally omitted from sharing payloads and CSV exports.

`status: 'terminated'` is distinct from a normal final game and may include an `endReason`.

## Sides and Participants

`GameSide` is a game-specific competing group rather than a generic team-one/team-two label. A
side can link to a saved team through `sourceTeamId`, but the two concepts are intentionally
different in scrimmages:

- `trackingMode: 'full-roster'` captures player identity.
- `trackingMode: 'anonymous'` intentionally leaves player identity untracked.
- `sourceTeamId` links a side back to a saved app team when applicable.

Participants are game-scoped player records and live once at game scope. A point's `PointLine`
assigns participant IDs to sides for that point, allowing the same participant to appear on
different scrimmage sides across the game.

While a game is `in_progress` and a side links to the current team through `sourceTeamId`,
roster changes sync one way into the game record and derived availability:

- Adding a roster player (including reactivating a player who was inactive at game start)
  appends a matching participant with `sourcePlayerId` bound to the roster player. No schema
  change is involved; the append persists with the live game like any other mutation.
- Deactivating a roster player is blocked (`blocked-current-game-participation` from
  `updateRosterPlayer`) once the player has any recorded action in the live game. The block
  consults the live game through a registered getter because the basic store cannot import
  the advanced store.
- Deleting a roster player is likewise blocked while the player has any recorded action in the
  live game. Deletion remains available after the game ends; historical advanced participant
  records are not removed.
- A deactivated zero-action participant is not removed from the record. Availability is
  derived: the tracker's live participant hook filters participants whose roster player is
  inactive, and the pending next-point line selection is pruned so a draft can never start a
  point with them. Participants without a matching roster player (deleted players, imported
  participants) remain available.

`PlayerRef` preserves three different meanings:

- `participant`: a known tracked player
- `unknown`: identity should have been tracked but was not captured
- `untracked`: identity was intentionally not captured for an anonymous side

Do not collapse `unknown` and `untracked`; analytics and UI use that distinction.

## Points and Possessions

A `TrackedPoint` contains:

- stable point ID
- starting lines by side
- optional injury-sub history
- ordered possessions
- optional between-point transitions after the point
- optional gender ratio
- point-timing and undo-revival timestamps

`PointLine` records each side's starting line. Applying injury substitutions through a particular
action derives that action's active line.

Player choices made while preparing the next line remain recoverable live-session state until the
pull starts the point. They are not appended to `points` or treated as official lineup history
before that pull. The pending selection is scoped to the active game and most recently completed
point, and is discarded when that context changes. Preparing and saving this selection during an
active halftime break does not end halftime; the break ends only after the next pull creates the
second-half point.

The pending selection stores lineup drafts only (with game and completed-point context for stale
state reconciliation). PullTracking derives the next receiving side, pulling side, and gender ratio
from the current game and settings. A pull can start only from a ready selection: every
`full-roster` side has exactly seven known, unique participants, no participant appears on both
sides, and an `anonymous` side has an empty line. Missing, stale, partial, or invalid selections
return to line preparation; undoing a pull does not restore the consumed selection.

A `PointPossession` is a possession record: it contains a stable ID, the side with the disc, and
ordered actions. Possession boundaries are explicit so team efficiency and turnover conversion do
not have to reconstruct them from a game-wide event stream.

The scoring side, score progression, next receiving side, and completed-point state are derived
from action order. They are not parallel persisted counters.

## Actions

Capture adapters do not write raw actions. They submit a typed semantic capture intent to the live
store, which plans any required anonymous-opponent pickup and appends canonical actions in one
transaction. A direct goal is persisted as a `throw` with `result: 'goal'`; it is not a completed
throw amended later. Touch capture permits self-passes and self-goals, so a goal thrower may also
be its receiver and is eligible during scorer correction.

`PossessionAction` is the union of:

| Kind          | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `pull`        | Puller, receiver when known, pull result, hang time, and optional location |
| `disc_pickup` | Pickup by a player establishing possession after a grounded or dead disc   |
| `throw`       | Completion, goal, or turnover result and its player attribution            |
| `stoppage`    | In-point timeout, injury, or manual pause                                  |

Throw results are `complete`, `goal`, `drop`, `throwaway`, `stall`, `block`, `pressure`, and
`callahan`.

Important semantics:

- `toPlayer` is required by behavior for completions and normal goals (the goal scorer), optional
  for drops, and absent when no receiver should be recorded.
- `defender` identifies the tracked defender for blocks, pressures, and Callahans when known.
- A Callahan is an offensive throw intercepted by the defense in the end zone it is defending,
  immediately scoring a goal. The tracked defender is the Callahan scorer; it has no assister.
- `splitAttribution` records the exceptional 50/50 judgment. Normal blame is derived from the throw
  result.
- Throwaways may have optional `details.type`: `huck` or `backfield_reset`. The manual type is
  action metadata; it does not change the result, attribution, or possession outcome.
- The live throw-type prompt is available only when the throwaway's side is fully tracked. An
  anonymous opponent throwaway has no live capture or supported classification analytics; fully
  tracked sides in a scrimmage are eligible.
- `recordedAt` is optional so imported or legacy data without action timing remains valid.
- Field locations use a discriminated `zone` or `xy` value and remain optional per action.

## Transitions and Pauses

Use the existing boundary that matches when the event occurs:

- `StoppageAction`: an interruption during a possession; it does not itself end the possession or
  point
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

Saved-game timelines and the active game's timeline support correcting the scorer on the action that
ended any completed point. A replacement scorer must have been active for the scoring side at that
exact action after applying any earlier injury substitutions. The thrower remains eligible so a
self-goal can be corrected away and restored. The correction preserves the point, possession,
action ID, result, side, ordering, and timing. Callahan corrections update the existing scoring
attribution field without changing which side scored. A live scorer correction does not create an
undo entry, so Undo continues to remove the recorded scoring action itself.

Thrower/assister corrections are intentionally deferred because they must also preserve disc-holder
continuity with the preceding pickup or completion. Structural result changes, action deletion, and
moving actions between possessions are not part of scorer correction.

The live store keeps a temporary undo stack for recent tracker operations; the undo stack is not
part of the persisted game schema. Persisted data remains the corrected source of truth.

Updating a throwaway's optional details does not create another undo entry. Undoing that turnover
removes the whole `ThrowAction`, including its details, in one operation.

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
2. Add and test migration behavior through `lib/advancedTracking/migrations.ts` and the storage
   boundary.
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
