# Advanced Red-Zone Possession Tracking

> **Status:** Initial backend-focused version implemented.

## Goal

Let a coach mark, during live advanced tracking, that the offense has entered a coach-defined red
zone. The canonical possession record should retain the observation and its capture time so team
analytics can derive red-zone conversion and timing without storing parallel counters.

This is a manual coaching judgment, not a measured field-location boundary. A future zone or XY
location system must keep measured location facts distinct rather than silently reinterpreting the
manual tag.

## Product Decisions

- Red Zone is a live selected/unselected toggle beneath the tracker scorecard's point timer.
- Either generic game side can be marked, including either side of a scrimmage.
- A possession can contain at most one red-zone entry. Leaving and re-entering before a turnover
  does not create another opportunity.
- A turnover immediately resets the toggle and makes it target the side that gained possession.
- The toggle is available only for the active possession. It cannot be added or corrected after a
  goal, termination, or later from the historical timeline in the first version.
- A full-roster side must have its current holder captured before Red Zone becomes available.
- If an anonymous side logically has possession but its lazy possession scaffold does not yet
  exist, selecting Red Zone creates that side's canonical possession and untracked pickup
  scaffold atomically.
- The first version exposes backend analytics only. It does not add an analytics-screen metric,
  CSV output, O/D split, defensive-stop label, or outcome-specific timing split.

## Persisted Model

Add one optional named concept to `PointPossession`:

```ts
export interface RedZoneData {
  /** Absolute timestamp (ms epoch) when the coach selected Red Zone during live play. */
  enteredAt: number;
  /** True when selecting Red Zone created the anonymous possession and pickup scaffold. */
  anonymousScaffold?: true;
}

export interface PointPossession {
  id: string;
  sideId: string;
  redZone?: RedZoneData;
  actions: PossessionAction[];
}
```

The presence of `redZone` means the possession entered the red zone, so a separate boolean would
be redundant. Selecting an already-selected possession is idempotent and preserves the original
`enteredAt`. Clearing the toggle removes `redZone`; selecting it again records a new timestamp.
`anonymousScaffold` records explicit cleanup provenance for the lazy anonymous possession created
by the toggle. It is absent from ordinary anonymous pickups and every full-roster possession.

Keep this on the possession rather than introducing a `red_zone_entry` action. The feature needs
one fact per possession, and a new action kind would unnecessarily complicate action ordering,
holder derivation, correction chains, timelines, and attribution.

The implementation advances the advanced-game schema from version 3 to version 4. Older records
need only be stamped to the current version; no red-zone data can be inferred. Full records remain
JSON blobs in SQLite, so the database table layout does not change. Sharing validation must accept
a valid timestamp and preserve the field through import and export.

## Capture and Undo Semantics

Expose an idempotent store mutation such as:

```ts
setCurrentPossessionRedZone(isRedZone: boolean): void;
```

The store, not the card, resolves the active point, logical possessing side, possession scaffold,
timestamp, and persistence update.

Changing Red Zone does not add an entry to the global tracker undo stack. The existing disc action
remains the latest undoable operation:

- undoing an ordinary pass after Red Zone was selected removes the pass but retains the tag;
- undoing the pickup that created a possession removes that possession and its red-zone data
  naturally; and
- undoing the turnover that caused an automatically created anonymous possession must also remove
  that dependent scaffold atomically, even though the toggle itself was not an undo operation.

Clearing Red Zone also removes an otherwise untouched anonymous scaffold identified by
`anonymousScaffold`, so selecting and then clearing the tag cannot change possession analytics.
Completed goal-to-undo dead time is retained in the point's `revivalPauses`, keeping Red Zone entry
and outcome timing accurate if the revived point is scored again.

An inbound opening pull cannot be amended to a dropped pull while that possession is marked Red
Zone. Clear the mark first so the correction cannot place the possession outcome before its entry.

Do not allow capture before a point starts, after the point ends, during an unresolved stoppage, or
for a full-roster side whose new holder has not been identified.

## Analytics Contract

Compile the raw possession into stat-friendly fields:

```ts
export interface AnalyticsPossession {
  // existing fields...
  enteredRedZone: boolean;
  /** Active-play time from point start to entry. */
  redZoneEntryElapsedMs: number | null;
  /** Active-play time from entry to this possession's goal or turnover. */
  redZoneOutcomeDurationMs: number | null;
}
```

Use the existing point/action timing conventions. Exclude completed in-point stoppages and
game-clock pauses from both intervals. Return `null` when required timestamps are missing or when
the possession has no resolved outcome.

Extend side-level team stats with:

```ts
redZoneEntries: number;
resolvedRedZonePossessions: number;
scoredRedZonePossessions: number;
redZoneConversionPct: number | null;
averageTimeToRedZoneMs: number | null;
averageRedZoneOutcomeDurationMs: number | null;
```

Derivation rules:

- `redZoneEntries` counts every marked possession owned by the requested side.
- A resolved red-zone possession ends in either a goal or turnover. Active and terminated
  possessions do not enter the conversion denominator.
- `redZoneConversionPct` is scored red-zone possessions divided by resolved red-zone possessions,
  or `null` when there are none.
- Average time to entry includes marked possessions with valid entry timing, including a currently
  active possession.
- Average entry-to-outcome duration includes only resolved marked possessions with valid timing.
- A marked offensive possession ending in a Callahan is a failed opportunity for that offense. The
  synthetic defensive Callahan possession used by existing conversion analytics is not a red-zone
  entry because no coach marked it.
- Aggregate analytics pool counts and duration samples across games; they do not average per-game
  percentages or averages.

## UI Boundary

The first control is compact and centered beneath the scorecard's point timer:

- use a stable test ID and button accessibility state;
- use an outlined unselected state and a semantic selected/toggled treatment;
- show the selected state directly from the canonical possession rather than mirrored local state;
- use a semantic red dot, red selected treatment, and a red scorecard outline while selected;
- leave the last-action card's Undo and More controls uncluttered; and
- work in supported portrait and landscape layouts without expanding into a tracker redesign.

## Verification

Add regression coverage at each owning layer:

1. Store tests for select, idempotent select, clear/reselect, side changes, holder requirements,
   anonymous scaffold creation, and causal turnover undo.
2. Migration and sharing tests for version-3 compatibility, valid version-4 data, and malformed
   timestamps.
3. Analytics tests for scoring and failed opportunities, unresolved exclusions, either-side
   perspective, Callahans, pooled aggregates, missing timestamps, and pause-adjusted intervals.
4. Route/component tests for visibility, accessibility state, toggling, and targeting the new side
   immediately after a turnover.
5. A Maestro tracker sequence covering a live entry, turnover reset, and entry by the next side.
6. Run the focused tests followed by `npm run check:all` because the eventual change spans the
   persisted model, capture behavior, and analytics.

## Implementation Map

| Concern                    | Primary source                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| Persisted model and schema | `lib/advancedTracking/types.ts`, `migrations.ts`                  |
| Live mutation and Undo     | `store/advancedTracking/trackingStore.ts`                         |
| Capture control            | `components/advancedTracking/scoreBar/RedZoneButton.tsx`          |
| Analytics compilation      | `lib/advancedTracking/buildAnalyticsGame.ts`, `analyticsTypes.ts` |
| Team and aggregate stats   | `lib/advancedTracking/advancedTeamStatsUtils.ts`                  |
| Sharing                    | `lib/sharing/validate.ts`, `serialize.ts`                         |
| Device verification        | `.maestro/tests/advanced-tracker-*.yml`                           |
