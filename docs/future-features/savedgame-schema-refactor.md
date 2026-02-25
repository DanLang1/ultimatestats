# SavedGame Schema Refactor

## Current State

The `SavedGame` structure in `lib/storage/types.ts` is intentionally flat and has grown
organically. The main design awkwardness is that `team1` is a full `SavedTeam` object
(id, name, roster) while `team2` is a loose collection of top-level fields:

```typescript
// Current - asymmetric
team1: SavedTeam;        // object
team2Name: string;       // flat
team1Score: number;      // flat
team2Score: number;      // flat
team1Color?: string;     // flat
team2Color?: string;     // flat
```

## Decision: Leave Until Team2 Scope Grows

As of the time of this note, team2 fields are: name, color, score. Roster is
inherently team1-only since we don't track opponent players. If this set stays
stable, the asymmetry is a design smell but not an active problem.

**Revisit if:** team2 gains more per-team fields, or if you need to render team1
and team2 interchangeably (generic team card components, two tracked rosters, etc.).

## Ideal Target Structure

```typescript
interface SavedTeamSnapshot {
  id?: string;          // team1 only
  name: string;
  roster?: Player[];    // team1 only
  color?: string;       // hex color at save time
  score: number;
}

interface SavedGame {
  id: string;
  schemaVersion: number;
  createdAt: number;
  importedAt?: number;

  team1: SavedTeamSnapshot;
  team2: SavedTeamSnapshot;

  settings: {
    gameTo: number;
    gameLength: number;
    startingPossession: 'team1' | 'team2';
  };

  events: GameEvent[];
  pointStartTimestamps?: Record<number, number>;
  pointLines?: PointLineRecord[];
}
```

## Migration Plan

### Schema version bump
Increment `CURRENT_SCHEMA_VERSION` to `3` in `lib/storage/types.ts`.

### Add runtime migration in `loadGames()`
`asyncStorageAdapter.ts` currently does no migration — `schemaVersion` is stamped
on save but never read back to trigger transforms. Add a `migrateGame()` call
before returning loaded games:

```typescript
function migrateGame(raw: any): SavedGame {
  if ((raw.schemaVersion ?? 1) < 3) {
    raw.team2 = {
      name: raw.team2Name,
      score: raw.team2Score,
      color: raw.team2Color,
    };
    raw.team1 = {
      ...raw.team1,
      score: raw.team1Score,
      color: raw.team1Color,
    };
    raw.settings = {
      gameTo: raw.gameTo,
      gameLength: raw.gameLength,
      startingPossession: raw.startingPossession,
    };
    raw.schemaVersion = 3;
  }
  return raw as SavedGame;
}
```

### TypeScript refactor
After the type change, the compiler will flag all ~21 affected files. The changes
are mechanical:

| Old field | New field |
|---|---|
| `game.team2Name` | `game.team2.name` |
| `game.team2Score` | `game.team2.score` |
| `game.team2Color` | `game.team2.color` |
| `game.team1Score` | `game.team1.score` |
| `game.team1Color` | `game.team1.color` |
| `game.gameTo` | `game.settings.gameTo` |
| `game.gameLength` | `game.settings.gameLength` |
| `game.startingPossession` | `game.settings.startingPossession` |

### Files to review (21 total)
- `store/gameStore.ts` — SavedGame construction and field reads
- `lib/sharing/serialize.ts`, `validate.ts`, `types.ts` — sharing payload
- `lib/statsUtils.ts` — CSV generation
- `lib/teamStatsUtils.ts`, `lib/playingTimeStatsUtils.ts` — stat computation
- `components/view-stats/SavedGamesList.tsx`, `AggregateGamesList.tsx`, `StatsContent.tsx`
- `app/(main)/ViewStats.tsx`, `saved-games/[gameId].tsx`, `Import.tsx`
- `app/(modals)/GameTimeline.tsx`, `EditEventModal.tsx`, `EditDurationModal.tsx`, `EditPlayerModal.tsx`
- `lib/__tests__/statsUtils.test.ts`, `sharingPayloadSize.test.ts`

### Sharing/import compatibility
Imported games from older app versions will have the old flat shape. The
`migrateGame()` function handles this since imported games go through
`storage.saveGame()` → `storage.loadGames()`, which will pass through the
migration on next load.
