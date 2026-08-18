# Advanced Throw Classification

> **Status:** Phase 1 implemented; broader classification and location-based throws remain future
> work.

## Implemented Phase 1

Tracked-side throwaways may carry one optional manual classification:

```ts
export type ThrowType = 'huck' | 'backfield_reset';

export interface ThrowDetails {
  type: ThrowType;
}

export interface ThrowAction {
  // existing fields...
  details?: ThrowDetails;
}
```

The detail belongs to the canonical `ThrowAction`; it is not a separate event or attribution.
Missing details mean that the throwaway was not classified. Phase 1 deliberately does not infer a
type and does not offer live capture or supported analytics for anonymous-opponent actions. Fully
tracked scrimmage sides are eligible for the same prompt as either side of a regular game.

After an eligible throwaway, the last-action card briefly offers `Huck` and `Backfield Reset`. The
choices are optional and non-blocking. The prompt is derived from the latest canonical action, so
it disappears naturally when tracking advances rather than relying on a timer or effect. Tapping a
selected choice clears it, and tapping the other choice changes it.

## Undo and Editing

`updateThrowType(...)` addresses a stable point, possession, and action ID and updates
`game.updatedAt`. It changes only the throw type concept, merging the selected type into any
existing details, and intentionally does not add an undo entry.

The existing throwaway operation remains the latest undo operation. One Undo removes the complete
throw action, including its `details`, and restores the possession state. Undo never peels the
classification off separately.

Historical throw-detail editing is not part of Phase 1. A future timeline editor can reuse the
same stable-ID mutation.

## Persistence and Data Boundaries

Phase 1 uses advanced schema version 3. Older records migrate by retaining every existing action
unchanged and stamping the current version; no classification is inferred. SQLite needs no table
change because the full game is stored as JSON.

Throw details are:

- validated on share import and retained on share export;
- copied to `ThrowAnalyticsAction` without changing attribution weights;
- shown as a secondary label in the saved timeline;
- exported in the action log's `Throw Type` column.

Existing completion, throwaway, plus/minus, and possession calculations remain unchanged.

## Location-Tracking Boundary

The raw model already reserves `origin` and `target` locations and supports `none`, `zone`, and
`xy` location modes, but live throw location capture is not implemented. A manual `huck` value is
the coach's qualitative classification; it must not be presented as a measured-distance huck.

Location-based huck attempts, distance thresholds, huck completion percentage, yards, and heat
maps still require capture of all relevant throws, including successful throws. Phase 1 only
answers questions about manually classified throwaways.

## Future Extension Decisions

Keep `ThrowDetails` as the extension point. Before adding values or fields, decide whether the new
fact describes:

- throw context or shape, such as an around, inside, hammer, or continuation;
- field role, such as reset versus attacking throw;
- throwaway cause, such as turf, overthrow, out of bounds, or miscommunication; or
- measured location/distance.

Do not collapse these independent dimensions into one large enum. If throwaway causes are added,
store them in a separate named field from `type`. If classification expands to all throws, reuse
the same `details` object and establish which values are valid for each result.

Likely follow-up work:

1. Validate `huck` and `backfield_reset` usage across real games.
2. Decide whether successful throws and other turnover outcomes should expose the same selector.
3. Add a historical detail editor if coaches need post-game correction.
4. Add breakdown utilities and analytics UI only after the vocabulary is stable.
5. Design zone/XY capture separately, preserving manual and measured facts.

## Implementation Map

| Concern                     | Source                                                  |
| --------------------------- | ------------------------------------------------------- |
| Persisted types and schema  | `lib/advancedTracking/types.ts`                         |
| Migration                   | `lib/advancedTracking/migrations.ts`                    |
| Stable-ID mutation and Undo | `store/advancedTracking/trackingStore.ts`               |
| Live selector               | `components/advancedTracking/TrackerLastActionCard.tsx` |
| Analytics compilation       | `lib/advancedTracking/buildAnalyticsGame.ts`            |
| Timeline                    | `lib/advancedTracking/advancedTimelineUtils.ts`         |
| CSV                         | `lib/advancedTracking/advancedCSVUtils.ts`              |
| Sharing                     | `lib/sharing/validate.ts`, `lib/sharing/serialize.ts`   |
