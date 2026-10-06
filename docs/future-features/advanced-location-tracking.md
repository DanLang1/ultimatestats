# Advanced Location Tracking

> **Status:** First-version design direction agreed September 2026. Not implemented.
> Concrete data-model proposal agreed October 2026; not implemented.
> Detailed overlay layout and exception controls remain to prototype.

## Goal and First-Version Scope

Build a new field-based capture UI that uses the existing advanced game model, selected before
the first pull and fixed for that game. It is not an extension of the existing tracker screen or
its player/gesture controls. Share domain logic and persistence, not the capture UI. Capture
approximate continuous coordinates rather than coarse regions.

Design for a dedicated tracker. Passes occur roughly every five seconds, with fast sequences every
one to two seconds. Preserving touches and outcomes takes priority over location completeness.
Missing observations must remain missing rather than becoming guessed coordinates.

The first version supports single-team games, including our defensive plays, pulls, and possession
boundaries. Do not capture ordinary opponent pass locations. Both-team tracking and scrimmage
support are deferred, while the model should remain compatible with locations for either side.

Heatmaps, passing maps, and estimated yardage are future uses of the data. Analytics presentation
is a separate feature, not part of this first version. Exact yardage is not the goal.

## Current Foundation

The existing persisted model already includes:

- `settings.locationMode`: `none`, `zone`, or `xy`.
- `FieldLocation`: a zone ID or an `x`/`y` pair.
- Pull `origin` and `landing`.
- Pickup `location`.
- Throw `origin` and `target`.
- Optional initial attacking-endzone orientation by side.

These are the current placeholder fields, not the proposed final schema.
The user confirms there is no location data in production games.

These fields are a foundation, not an implemented spatial contract. Pass/pickup capture intents
currently do not accept locations, and the analytics projection does not carry them. The existing
orientation comment mentions halftime but omits ordinary point-to-point direction changes; it must
be reconciled when implementing direction derivation.

See [the maintained data model](../features/advanced-tracking/data-model.md) and
[`types.ts`](../../lib/advancedTracking/types.ts). Reuse the canonical point / possession / action
model and semantic capture boundary rather than creating a parallel event log.

## Agreed Observation Semantics

Store approximate normalized coordinates against a fixed physical-field frame. Screen rotation or
visual compression must not change their meaning. The concrete proposed schema is defined below.

- **Catch:** where the receiver caught the disc. Do not separately capture the actual release spot
  after a player runs or establishes a pivot.
- **Pickup:** where our possession begins after a grounded/dead disc. Keep this distinct from an
  earlier failure or an OB pull boundary estimate.
- **Failure:** observed drop, block, or ground-contact location, not the intended receiver's spot.
- **Our defensive play:** capture our block or Callahan location even though the existing model
  represents it on the opponent's failed throw. The block location is exactly the user-tapped spot.
  Do not automatically copy it to our next possession; capture the pickup separately.
- **In-bounds pull:** where it is caught or picked up to establish possession. One tap supplies
  this location; do not separately ask for first ground contact when a pull rolls.
- **Dropped pull:** observed drop location on the pull action, using the same optional `location`
  field as other pull outcomes. Capture the next possession's pickup separately.
- **OB pull:** approximate boundary location, followed by a separate possession-start observation
  where play resumes. This is the exception to treating in-bounds pull/pickup locations as one.
- **Out of bounds:** an OB observation plus an approximate position along the nearest boundary.
  Distance outward from the boundary is not measured. Do not silently equate this with the next
  pickup location.

Attach observations to stable existing action identities. Treat a catch as one observation, not
independent copies for the incoming endpoint and outgoing origin. Future touch-to-touch paths can
be derived from consecutive observations; they must not be presented as measured release paths.
Do not bridge missing locations with invented observations.

The model should remain editable in the future. No location editor, backfill workflow, or correction
API is required for this first version. Live capture is the only writer, so do not repeat
`source: 'live'` on every action. A future editing feature can add an optional action-level
`locationUpdatedAt` timestamp when a location is added or changed later. Do not add that field,
a confidence score, or edit-history machinery now.

## Concrete Data-Model Proposal

These snippets describe future changes, not currently implemented interfaces. Keep the existing
point / possession / action hierarchy. Reuse pickup `location`; rename throw `target` and the
unused pull `landing` placeholder to `location`. All three action kinds use the same field name
for the observed event location; the action kind and result determine its meaning.

```ts
export type LocationMode = 'none' | 'xy';

export type FieldLayout = 'usau_standard_v1';

export interface FieldLocation {
  /** Across the fixed field: left sideline = 0, right sideline = 1. */
  x: number;
  /** Along the full fixed field: near back line = 0, far back line = 1. */
  y: number;
}

export interface AdvancedTrackingSettings {
  locationMode: LocationMode;
  fieldLayout?: FieldLayout;
  format?: GameFormatSettings;
}
```

Remove the unused zone variant and per-location `locationType` discriminator. `fieldLayout`
identifies the immutable dimension/coordinate basis once per game; there is no per-action layout,
provenance string, observation wrapper, or location-event collection.

Retain the existing game-level `initialAttackingEndzoneBySide` field, using the existing named
`Endzone` type (`near | far`). Pregame selection of the end we defend maps to the opposite attacking
end. Do not add another stored defending-end field or per-point orientation copy.

### Coordinate Frame

Define `(0, 0)` as the near-left outer corner when looking from the near end toward the far end.
In the canonical portrait drawing, that is the bottom-left corner. `x` increases rightward; `y`
increases toward the far end. The same physical corners retain those values throughout the game.
A rotated display applies a view transform and its inverse for input, not a data rewrite.

For `usau_standard_v1`, the full field is 40 yards across and 110 yards long. The near goal line
is `y = 20 / 110`; the far goal line is `y = 90 / 110`. Position-to-distance conversion uses
`x * 40` and `y * 110`. Ten-yard guides are display aids, not coordinate snapping or rounding rules.
Do not quantize stored taps to ten-yard increments.

### Action Fields and Ownership

```ts
// Spatial fields on existing action interfaces; unrelated fields remain as they are.

// PullAction
location?: FieldLocation;
// Existing result: 'ob' already identifies an OB pull.

// DiscPickupAction
location?: FieldLocation;

// ThrowAction
location?: FieldLocation;
outOfBounds?: true;
```

Remove unused pull/throw `origin` fields. Keep one canonical observation per captured event.
For throws, `location` is the observed endpoint, never an intended receiver location:

| Action/result                       | Stored spatial value                                     |
| ----------------------------------- | -------------------------------------------------------- |
| Completion or goal                  | `location`: catch location                               |
| Drop, throwaway, block, or pressure | `location`: observed failure location                    |
| Callahan                            | `location`: interception/scoring location                |
| Stall                               | No `location`; there is no throw endpoint                |
| Pickup                              | `location`: independently observed possession-start spot |
| In-bounds / roller pull             | `location`: catch/pickup establishing possession         |
| Dropped pull                        | `location`: observed drop spot                           |
| OB pull                             | `location`: approximate boundary spot                    |

An OB throw has `outOfBounds: true`; ordinary throws omit the property instead of storing `false`.
An OB pull uses its existing `result: 'ob'` without a second OB flag. Missing coordinates are
represented by omitted fields, not `null`, `(0, 0)`, or a copied previous location. An independently
known OB result may remain present even when its coordinate is missing.

The gray-strip adapter projects the tap onto the nearest boundary in field space before storing
it. Stored OB coordinates therefore have `x` or `y` exactly equal to `0` or `1`. The strip's outward
screen distance is discarded. Corner ties share the same corner coordinate; no extra boundary ID
is needed.

For example, Sam's pickup stores `location`, Alex's subsequent catch stores the incoming throw's
`location`, and Casey's catch recorded without a coordinate stores no `location`. A later known catch must not skip Casey
and fabricate a direct pass from Alex. Derive paths from adjacent touches within a continuous
possession; never automatically connect across a turnover or an OB pull restart.

For an in-bounds opening pull, `PullAction.location` owns the single observed catch/pickup spot.
The existing holder logic currently relies on a subsequent pickup action rather than the pull's
receiver. Integrating the new UI must establish the holder without asking for or storing a second
copy of the same coordinate. If a holder-establishing pickup scaffold remains necessary, it has
no independently captured location; the opening touch uses the in-bounds pull's observation.
Do not apply this reuse to an OB pull or to a later pickup after a turnover. A dropped pull ends
that opening sequence and must not supply an inferred location for the next possession.

### Validation and Capture Boundary

- Both coordinates must be finite numbers in `[0, 1]`; reject malformed imported values rather
  than silently clamping them. Only UI touch mapping projects gray-strip taps onto the boundary.
- New `xy` games require `fieldLayout: 'usau_standard_v1'` and valid, opposite initial attacking
  ends for the game's two sides. `none` games omit spatial setup and observations.
- Every action location remains optional, including in `xy` games. Missing player identity and
  missing location are independent facts. Capture, validation, persistence, sharing, and reload
  must support known outcomes and players with no coordinate; no placeholder location is required.
- `outOfBounds` is absent or `true`, and applies to failed throws, not completions, goals,
  Callahans, or stalls. When an OB endpoint is present, it must lie on the boundary. An OB pull
  follows the same boundary rule for its optional `location`.
- Do not recompute action results from coordinates during load/import. End-zone-to-goal and
  gray-strip-to-throwaway shortcuts belong to live capture, not persistence validation.
- Extend the existing semantic capture boundary to accept an optional location and the initial
  observation time. Map the location to the appropriate canonical action field and the time to
  `recordedAt`. Use that observation time for gameplay timing, including goal/Callahan
  `elapsedMsAtEnd` and pull point-start timing, so later player selection adds no event duration.
  Keep commit time for record bookkeeping such as `updatedAt`.
- Synthetic anonymous-opponent scaffolding receives no location. It must not be timestamped later
  than the outcome it precedes; use the same observation time for the atomic operation without
  implying that the scaffold is an independently observed pickup.
- Commit location, outcome, and attribution together. Existing action undo removes all of them.
  Pending selection retains the event time transiently; no observation ID or additional persisted
  location timestamp is needed.

### Mode Gating and Existing-Tracker Isolation

Use the game's `settings.locationMode` as the explicit boundary: `none` uses the existing tracker;
`xy` uses the new field-based UI. Active-game resume/navigation must respect that mode rather than
opening an `xy` game in the old tracker. The game model, action/result semantics, storage, and
non-spatial statistics remain shared.

Only the new mode exposes spatial setup, input, and location-specific shortcuts. Existing tracker
adapters remain coordinate-free and retain their current timestamp defaults and interactions.
The shared capture/store boundary must reject spatial payloads for `none` games rather than
silently introducing locations into them. Optional spatial fields on shared types do not make
location capture an implicit feature of every caller.

Every backend location remains optional even in `xy` mode. The new UI must support capture
without a location so a missed coordinate never forces a guessed tap or a lost event. The exact
control remains a later UI decision; no specific Player-only control is required. Do not connect
the new screen to the old tracker as a fallback.

Historical action/timeline editing is disabled for `xy` games in the first version, including
existing participant/result correction entry points. Gate the mutation boundary as well as the
visible controls so shared editors cannot change a location-mode action indirectly. Existing
editing behavior for `none` games stays available. This avoids extending correction semantics for
spatial fields now (for example, clearing a location when a throwaway is changed to a stall).
Normal live undo and ordinary gameplay transitions remain supported.

### Schema, Persistence, and Sharing

Bump the advanced-game schema version when implementing the new contract (currently version 4).
The user confirms no production game contains spatial observations, so no parallel legacy-location
representation or coordinate conversion layer is required. Existing production games retain their
non-spatial data and `locationMode: 'none'`; do not backfill coordinates, a field layout, or
orientation. Update development fixtures containing the old placeholder shapes deliberately.

Update validation and serialization to the new coordinate shape and named modes. Preserve spatial
fields and game-level setup through SQLite saves, reloads, and JSON sharing/import round-trips.
Use the existing whole-record persistence boundary; no second spatial table/store is needed.
Do not assume old optional coordinates already followed this newly defined convention.

No location editor, new spatial CSV report, or analytics presentation is part of this stage.
When implementation ships, update maintained model documentation to describe the implemented
contract; this future-feature proposal must not imply it exists already.

### Verification for Future Implementation

Cover finite/range validation (including valid zeroes and rejected NaN/Infinity), goal-line
positions and view-transform round-trips, and preservation of missing coordinates. Verify gray
OB projection, OB flags versus pull results, and rejection of incompatible spatial payloads.

Verify action field ownership for catches, failures, pickups, pulls, and our defensive plays;
ensure blocks do not populate pickups and unlocated touches break derived paths. Verify a single
in-bounds pull observation establishes the opening touch without duplicated coordinates, while
OB pull restart observations remain separate. Verify dropped-pull locations remain on the pull
and never populate the following pickup. Test capture and round-trips with missing locations for
all supported outcomes. Verify delayed player selection preserves initial-tap timestamps and
point duration, including goals, Callahans, pull point starts, synthetic-action ordering, and undo
followed by rescoring. Test atomic undo, opening direction, normal point changes, halftime reset,
and halftime undo. Confirm old non-spatial games remain unchanged apart from schema migration and new spatial
games round-trip through persistence and sharing without redundant origin/provenance fields.
Verify mode-aware resume, rejection of spatial capture in `none` games, and historical-edit gating
for `xy` games while existing tracker behavior and editing remain unchanged.

## Field Dimensions and Orientation

Use a fixed USA Ultimate standard field: 70 yards between goal lines, 40 yards wide, and two
20-yard end zones (110 yards overall). Show subtle ten-yard ticks/hashmarks as estimation aids.
No field-size customization in the first version. Keep the field basis identifiable in saved data
so future yardage interpretation does not depend on an unexplained global assumption.

Source: [USA Ultimate field dimensions](https://usaultimate.org/rules/10-simple-rules/).

Select our starting end before play and lock it once the game begins. No starting-end editor or
point-level direction overrides in this version. Derive attacking direction from that anchor,
point history, and the existing halftime transition:

- Reverse attacking direction between ordinary points.
- Start the second half opposite the game's opening direction, regardless of the direction just
  before halftime.
- Reuse existing halftime rederivation on undo. Do not introduce a second saved halftime marker.

This describes attacking direction; recorded physical-field coordinates do not flip. View rotation
is separate from stored coordinates. See [USA Ultimate rules 6.A.3 and 9.B](https://usaultimate.org/rules/).

## Chosen Interaction: Field with Bottom Player Overlay

The resting screen emphasizes the field, current disc holder, and minimal game controls. The
player pad is hidden until needed. The bottom overlay is the chosen approach, not a competition
with radial or always-visible player selection. It may need a custom component; no particular
navigation modal or bottom-sheet library is selected.

### Ordinary Completion

1. Tap approximately where the catch occurred.
2. Show a pending marker and immediately reveal the bottom player pad.
3. Tap the receiver to commit the completion and automatically dismiss the pad.
4. Show the new holder and accept the next field tap immediately.

The existing holder supplies the thrower. A proposed layout is seven players plus Unknown in two
rows, with stable player slots throughout the lineup. Do not reorder by predicted receiver or
remove the holder and shift everyone else. Exact sizing and auxiliary controls remain open.

### Goals and Out-of-Bounds Throws

During our possession, tapping the attacking end zone selects a goal. Selecting the scorer commits
it. No swipe or extra goal confirmation is required. Pull and pickup contexts do not interpret an
end-zone tap as a score. Detailed Callahan capture remains to be designed.

A gray strip around the field is an OB touch target. During our possession, tapping it immediately
commits a throwaway by the current holder, with an OB flag and approximate nearest-boundary
location. Do not open a turnover confirmation first. Normal undo handles accidental taps or a
play that should have been attributed differently. The strip's thickness is only a usable touch
area, not an off-field distance scale.

In pull-tracking context, the gray strip records an OB pull result and approximate boundary
location, not a throwaway. Other turnover controls must continue to support the existing results
and attribution rules; OB does not replace those domain concepts.

### Pull Outcomes

Provide an outcome choice for the pull before recording its optional location, using the same
capture flow for inbound, roller, dropped, and OB results. A dropped pull can carry its observed
drop location without a separate spatial model. The gray-strip shortcut selects OB consistently
with that outcome choice. Exact controls remain to prototype.

Keep outcome, player selection, location, and the field-tap time pending until the pull is committed
as one operation. This flow does not need the existing post-commit `amendOpeningPullAsDropped`
operation; gate that amendment for `xy` games under the result-edit restriction. An incorrectly
committed pull uses normal undo and recapture. Existing tracker behavior remains unchanged.

### Missing Location and Timing

Capture without a coordinate is supported throughout the data model and must be available in
the new UI. The skip-location control design remains open. Do not carry forward the previous
player's location or switch to the existing tracker to satisfy a missing coordinate.

Use the initial field tap as the event time, even though the receiver or other attribution is
selected later. Receiver-selection delay must not affect action timestamps, point duration, or
timing restored by undo. For capture without a field tap, use the committing player/outcome
interaction time. Pending observations retain the initial tap time transiently; opening or
cancelling the pad must not append partial gameplay actions. An OB throwaway commits at its
field tap.

### Undo and Editing Scope

Keep normal live undo through the existing canonical boundary. Disable historical action/timeline
edits for this new mode in live and saved games initially, not just coordinate editing. No adding,
moving, clearing, or backfilling locations on recorded actions in this version. This supersedes
the earlier proposal to support location correction between points and after games. Missing
locations can remain missing permanently in this version.

Cancelling or repositioning an uncommitted field selection is part of capture, not a historical
location editor. Existing tracker games retain their correction features; mode gating prevents
those features from being applied to location-mode games.

## Layout Questions Still to Prototype

- Keep the field stationary when the pad appears; do not resize or shift the selected spot.
- Make the pad immediately interactive, with no animation delay or manual dismissal after commit.
- Keep pending and committed observations visually distinct.
- Work out occlusion near the bottom end zone and how to cancel/reposition a pending selection
  covered by the pad. Preserve predictable bottom player targets.
- Define stable slot behavior for substitutions and line changes.
- Determine portrait field proportions and landscape composition. A proportionally accurate field
  can remain narrow even when the pad is hidden; modest display compression is an option.
- Define remaining in-bounds turnover, defensive-play, Callahan, stall, and skip-location flows
  without changing the agreed observation meanings.

Follow the existing [responsive-layout](../responsive-layout.md) and [UI](../ui-patterns.md)
contracts. Avoid a sheet that dims the whole field, requires dragging, or blocks rapid input.

## Earlier Concepts and Deferred Work

The earlier static mockup showed an always-visible pad, not the selected temporary overlay.
Radial selection, an always-visible pad, and two-thumb player modifiers were considered but are
not the chosen first-version interaction. Region-only and possession-boundary-only capture were
rejected as insufficient for this mode.

Deferred work includes historical action editing and location backfill for the new mode, analytics
presentation, both-team/scrimmage
capture, ordinary opponent pass locations, configurable field dimensions, and orientation overrides.
Do not add a release-location or stoppage-relocation capture system in this first version.

Future analytics should distinguish touch locations from player occupancy or off-disc movement,
label yardage as approximate, and expose location coverage. Keep existing coach-defined Red Zone
metadata separate from any future location-derived metric.

## Next Steps

The concrete data-model proposal above is the next implementation foundation, before detailed UI.
Implement and verify its types, validation, schema migration, persistence, and sharing first, then
integrate optional coordinates and initial-tap timestamps into capture commands and undo. Keep
location editing and analytics presentation deferred. This document update does not itself
authorize implementation.

Then prototype the chosen bottom-overlay interaction. Evaluate ordinary play and one-to-two-second
bursts, sideline/end-zone taps, accidental OB throwaways and undo, missing-location capture, long
names, pulls, defensive plays, and rapid possession changes. Measure missed events, wrong players,
location error, and attention taken away from play—not just tap count. Validate portrait and
landscape on real phone sizes. No implementation is committed by this document.
