# Advanced Game Sharing

> **Status**: Implemented in app — verify Supabase type constraints before release

## Overview

Extend the existing share/import system to support `AdvancedTrackedGame` objects, using the same `shared_payloads` Supabase table and the same import screen flow already built for basic games and teams.

---

## What Already Exists

The sharing infrastructure is generic enough that **no new Supabase table is needed**. The `shared_payloads` table stores `type` (text) and `payload` (jsonb) — the payload column has no schema constraints, so it can hold any structure.

The existing URL routing, upload/fetch logic, and `Import.tsx` page are all reusable. Advanced games just need a new `type` arm throughout the stack.

See [sharing.md](./sharing.md) for the full existing design.

---

## Data Structure Difference

Basic `SavedGame` has a flat `events[]` array. Advanced games are significantly more nested:

```
AdvancedTrackedGame
  └── points[]
        └── possessions[]
              └── actions[] (pulls, throws, stoppages)
```

Additional fields not present in basic games:

- `sides[]` — both teams, each with a `trackingMode` (`full-roster` | `anonymous`)
- `participants[]` — all players across both sides
- `gameTransitions[]` — halftime, soft cap, hard cap
- Field location tracking per action (`FieldLocation` — zone or xy coordinates)
- Point-level timestamps (`startedAt`)
- `focusSideId`, `initialReceivingSideId`, endzone orientation

**Schema version**: `ADVANCED_TRACKING_SCHEMA_VERSION = 1` (separate from basic game schema version)

---

## What Needs to Change

### 1. `lib/sharing/types.ts`

Add new arms to the `SharedPayload` discriminated union:

```typescript
| (SharedPayloadBase & { type: 'advanced-game'; data: AdvancedTrackedGame })
| (SharedPayloadBase & { type: 'advanced-games'; data: AdvancedTrackedGame[] })
```

### 2. `lib/sharing/validate.ts`

Add a new validation branch for `advanced-game`. Key considerations:

- The existing `MAX_PAYLOAD_EVENTS = 500` doesn't map directly — advanced games use `actions` per possession, not a flat events list. Need a new limit (e.g. total actions across all possessions/points).
- Validate nested structure: `sides`, `participants`, `points → possessions → actions`
- Validate `PlayerRef` discriminated union (`participant`, `unknown`, `untracked`)
- Validate `FieldLocation` if present
- This is the most complex piece — the nesting depth is significant

### 3. `lib/sharing/serialize.ts`

Add `serializeAdvancedGame()` and `serializeAdvancedGames()`:

```typescript
export function serializeAdvancedGame(game: AdvancedTrackedGame): SharedPayload {
  return {
    type: 'advanced-game',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: game,
  };
}
```

### 4. `lib/sharing/share.ts`

No changes needed — `uploadPayload` is already generic.

### 5. `hooks/useShareImport.ts`

- Add `AdvancedGamePayload` extract type
- Add new states to `ShareImportState`:
  - `{ status: 'preview-advanced-game'; payload: AdvancedGamePayload; isUpdate: boolean }`
  - `{ status: 'done'; type: 'advanced-game'; gameId: string }`
- Add branch in `deriveImportState` — check if `AdvancedTrackedGame` with same `id` already exists in the advanced tracking store

### 6. `app/(main)/Import.tsx`

- Add `AdvancedGamePreviewContent` component — show opponent name, date, point count, score
- Add done handling for `type: 'advanced-game'` — "View Game" navigates to the advanced game detail screen
- Preview should surface: `metadata.opponentName` (or fallback), point count, score if available

### 7. `app/s/[kind]/[shareId].tsx`

Add `'advanced-game'` as a valid `kind` in the route validation so deep links like `u-stat.app/s/advanced-game/<id>` route to the import screen.

### 8. Advanced tracking store (`store/advancedTracking/trackingStore.ts`)

Add `importAdvancedGame(game: AdvancedTrackedGame)` action — analogous to `importGame()` in the basic `gameStore`. Should add `importedAt` timestamp and handle deduplication (replace existing if same `id`).

### 9. Advanced tracking UI

Add a share button — currently no export entry point exists for advanced games. Likely location: the advanced game detail/stats screen header, mirroring the basic game ViewStats share button.

### 10. Supabase

Check if the `type` column on `shared_payloads` has a check constraint. If so, add `'advanced-game'` as an allowed value in a migration.

---

## URL Structure

```
https://u-stat.app/s/advanced-game/<id>
https://u-stat.app/s/advanced-games/<id>
```

Consistent with existing `/s/game/<id>`, `/s/team/<id>`, `/s/games/<id>` pattern.

---

## Payload Size Estimate

Advanced games are denser than basic games due to field location data and per-action metadata. Worth running a size test (similar to `lib/__tests__/sharingPayloadSize.test.ts`) before shipping to confirm payloads stay under the 256KB Supabase column constraint.

---

## Key Files to Change

| File                                      | Change                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| `lib/sharing/types.ts`                    | Add `type: 'advanced-game'` / `advanced-games` arms   |
| `lib/sharing/validate.ts`                 | New validation branch + new size limits               |
| `lib/sharing/serialize.ts`                | Add `serializeAdvancedGame()`                         |
| `hooks/useShareImport.ts`                 | New payload type + new `ShareImportState` arms        |
| `app/(main)/Import.tsx`                   | New preview component + done handling                 |
| `app/s/[kind]/[shareId].tsx`              | Allow `advanced-game` kind                            |
| `store/advancedTracking/trackingStore.ts` | Add `importAdvancedGame()` action                     |
| Advanced game detail screen               | Add share button (export entry point)                 |
| Supabase migration                        | Allow `advanced-game` in `type` column if constrained |
