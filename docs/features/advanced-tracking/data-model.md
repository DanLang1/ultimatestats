# Advanced Tracking Data Model

> Maintained guide to the implemented persisted model. `lib/advancedTracking/types.ts` is the
> authoritative definition. The current schema is `ADVANCED_TRACKING_SCHEMA_VERSION = 4`.

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
- optional private `note` of up to 1,000 characters; point notes persist locally, are editable from
  live/saved point timelines and between-point surfaces, and are omitted from sharing payloads and
  CSV exports
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

A `PointPossession` is a possession record: it contains a stable ID, the side with the disc,
ordered actions, and optional `redZone` metadata. `redZone.enteredAt` records when a coach manually
marked that possession as entering a coach-defined red zone; it is not inferred from field
location. Possession boundaries are explicit so team efficiency, turnover conversion, and Red
Zone outcomes do not have to reconstruct them from a game-wide event stream.

Red Zone is captured only against the active possession. A full-roster side needs a current holder
before it can be marked. If an anonymous side logically has possession but has not yet materialized
its lazy possession, marking Red Zone atomically creates that possession with an untracked pickup
scaffold and sets `redZone.anonymousScaffold` to identify its provenance. Ordinary anonymous
pickups and full-roster possessions omit that flag. Clearing Red Zone before another action removes
the flagged scaffold so the toggle does not change possession analytics by itself. An inbound
opening pull cannot be amended to a dropped pull while its possession is marked Red Zone; clear the
mark before making that correction. Undo preserves Red Zone metadata when its possession still has
a valid holder, including when a goal is undone across a point boundary. If undo removes the action
that established a full-roster holder, the now-invalid Red Zone marker is cleared with that
structural correction.

The scoring side, score progression, next receiving side, and completed-point state are derived
from action order. They are not parallel persisted counters.

## Actions

Capture adapters do not write raw actions. They submit a typed semantic capture intent to the live
store, which plans any required anonymous-opponent pickup and appends canonical actions in one
transaction. A direct goal is persisted as a `throw` with `result: 'goal'`; it is not a completed
throw amended later. Touch capture permits self-passes and self-goals, so the same participant can
own multiple distinct occurrences in a correction chain.

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
- Eligible throws may have optional `details.type`: `huck` or `backfield_reset`. Huck is valid on
  complete, goal, drop, throwaway, block, and pressure results; backfield reset is valid only on
  drop, throwaway, block, and pressure results. The manual type is action metadata; it does not
  change the result, attribution, or possession outcome.
- The live throw-type prompt is available only when the throw's side is fully tracked. Anonymous
  sides have no live classification capture or supported player analytics; fully tracked scrimmage
  sides are eligible.
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
- `revivalPauses` preserves each completed goal-to-undo dead-time interval so historical timestamps,
  including Red Zone entry and outcome timing, remain accurate after the point is scored again.

Timing fields are optional. Derivations must distinguish missing timing data from zero duration.

## Editing and Undo

Point, possession, action, transition, and participant IDs are stable editing boundaries. Normal
corrections update payload fields without moving historical actions between possessions or points.

Saved final or terminated games and the loaded active game's timeline support participant identity
correction on completed points. The editable unit is a touch occurrence in a continuous segment:
a pickup establishes the first holder, completions add receiver occurrences, and a goal, drop, or
50/50 drop can add a terminal receiver. Replacing an interior occurrence updates both its incoming
receiver and the next throw's thrower atomically. Repeated identities and self-passes remain
separate occurrences. When a supported terminal throw has no preceding pickup chain, its receiver
is still editable as a one-touch segment.

Pull receivers and Callahan scorers are standalone correction contexts. Pullers, ordinary block or
pressure defenders, stall attribution, action results, action order, and possession structure are
not editable through touch correction. Completed-point timeline turnover actions have a separate
atomic correction boundary for `drop`, 50/50 drop (`drop` plus `splitAttribution`), `throwaway`,
`block`, `pressure`, and `stall`. That editor can correct the holder/thrower, the applicable
receiver or defender, the turnover result within that family, and eligible huck/reset details.
The target must be the possession's final non-stoppage turnover action, its side must match the
possession side, and the point must contain the following possession for the opposing side. This
canonical boundary keeps invalid imported action chains out of the editor and correction operation.
Changing the holder also updates the preceding pickup or completion receiver so holder continuity
remains valid. It never changes a goal/completion, Callahan, pull drop, possession boundary, action
order, or point structure. A stall removes incompatible throw details. Anonymous `untracked`
identities remain read-only; an existing `unknown` identity on a fully tracked side can be replaced
with a known participant.

Replacement participants come from the game snapshot and must be active at every action field the
correction mutates after applying earlier injury substitutions. Imported or legacy chains with
invalid receiver-to-next-thrower continuity remain readable but are not editable. Touch identity
corrections preserve point, possession, action IDs, results, sides, ordering, timing, locations,
throw details, and other metadata. Turnover corrections preserve IDs, sides, ordering, timing,
locations, and unrelated metadata, but may change results and throw details within the supported
turnover family as described above. Corrections update `updatedAt`, persist immediately, and do not
create an undo entry.

The live tracker and advanced timeline correct the active line at their respective boundaries, not
the point's starting line directly. The live boundary is the current line after the latest action;
the timeline boundary is the final line before a goal or Callahan, or the final line of the last
unfinished point when a game is terminated. Both surfaces derive that line from raw point lines and
ordered injury substitutions and use one domain correction operation.

The selected active line is canonical intent. The correction reverse-replays every trusted injury
substitution to derive the corrected starting line stored on the point. Injury substitutions remain
unchanged, and every participant referenced by an action or injury event remains protected in the
history required by that event. Actionless, injury-unconstrained participants may be replaced or,
when both sides are fully tracked, moved atomically between sides. Fully tracked lines require seven
unique game participants in normal UI flows. Corrections reject invalid existing history, persist
immediately, and do not add an undo entry.

Structural result changes, action deletion, action reordering, and moving actions between
possessions are intentionally outside touch correction.

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

Use the assertions in `lib/advancedTracking/trackingUtils.ts` and the shared operations in
`lib/advancedTracking/advancedTouchCorrectionUtils.ts` and
`lib/advancedTracking/advancedPointLineCorrectionUtils.ts` rather than introducing another
validation pattern.

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

1. Update the exported types and schema version. Schema 4 introduces optional possession-level Red
   Zone data and point revival-pause history without backfilling older records. Schema 3 introduced
   optional throw details and private notes; absent optional data means that it was not captured.
2. Add and test migration behavior through `lib/advancedTracking/migrations.ts` and the storage
   boundary.
3. Update sharing validation and serialization.
4. Update analytics compilation and downstream stat utilities.
5. Update seeded tests, Maestro fixtures, and this document.

Do not reinterpret an existing field in place when old persisted records would become ambiguous.

## Related Sources

| Concern                        | Source                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Persisted types                | `lib/advancedTracking/types.ts`                           |
| Live mutations and undo        | `store/advancedTracking/trackingStore.ts`                 |
| Validation and invariants      | `lib/advancedTracking/trackingUtils.ts`                   |
| Timeline turnover correction   | `lib/advancedTracking/advancedTurnoverCorrectionUtils.ts` |
| SQLite persistence             | `lib/advancedTracking/storage.ts`                         |
| Saved-game cache and summaries | `store/advancedTracking/savedGamesStore.ts`               |
| Analytics compilation          | `lib/advancedTracking/buildAnalyticsGame.ts`              |
| Sharing validation             | `lib/sharing/validate.ts`                                 |
