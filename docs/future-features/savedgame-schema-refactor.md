# SavedGame Schema Refactor

> **Status**: Deferred proposal. Do not implement without a concrete product requirement.

## Current State

The basic `SavedGame` schema in `lib/storage/types.ts` intentionally reflects single-team stat
tracking:

- `team1` is a full saved-team snapshot with the tracked roster.
- `team2Name` and the two score/color fields are lightweight opponent metadata.
- events, point timing, and point lines remain separate flat collections.

The asymmetry is acceptable while only one roster is tracked. Advanced both-team and scrimmage
tracking already uses its own symmetric side model and must not be used as a reason to reshape basic
records by itself.

## Revisit When

- basic tracking begins capturing an opponent roster,
- basic screens need to render either side interchangeably,
- repeated opponent metadata makes the flat shape materially error-prone, or
- another approved feature produces a concrete migration benefit.

## Possible Direction

A future schema could introduce two `SavedTeamSnapshot` values and group basic format settings:

```ts
interface SavedTeamSnapshot {
  id?: string;
  name: string;
  roster?: Player[];
  color?: string;
  score: number;
}

interface SavedGame {
  // existing identity and timestamps
  team1: SavedTeamSnapshot;
  team2: SavedTeamSnapshot;
  settings: {
    gameTo: number;
    gameLength: number;
    startingPossession: 'team1' | 'team2' | null;
  };
  events: GameEvent[];
  pointStartTimestamps: Record<number, number>;
  pointLines: PointLineRecord[];
}
```

This is an exploration, not an approved target. Keep optionality and legacy behavior explicit if
the design is revisited.

## Migration Requirements

The current basic schema is version 6 and already has a migration pipeline under
`lib/storage/migrations/`. A future implementation must:

1. Increment `CURRENT_SCHEMA_VERSION` from whatever version is current at implementation time.
2. Add the next sequential migration and snapshot fixtures.
3. Preserve legacy nullability and defaults rather than assuming all older records are complete.
4. Migrate shared/imported payloads before consumers read the new shape.
5. Update sharing validation, basic store construction, analytics, timeline editing, CSV/PDF
   exports, and route tests.
6. Keep the migration idempotent and covered by `migrations.test.ts` and
   `migrations.snapshot.test.ts`.

Primary consumers currently live in:

- `store/basic/`
- `lib/basic/`
- `lib/storage/`
- `lib/sharing/`
- `components/view-stats/`
- `app/(main)/(hub)/(analytics)/`
- `app/(modals)/`

Do not hard-code a future schema number or introduce a second migration path.
