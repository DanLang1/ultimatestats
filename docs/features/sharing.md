# Sharing

> Maintained reference for the implemented game, advanced-game, and team sharing flow.

## Scope

Sharing creates a point-in-time copy. Imported data is independent from the sender's copy; this is
not account sync or collaborative editing.

Private advanced-game notes are local-only metadata. Single-game and bulk serializers omit them,
and validation strips notes from any incoming payload before import.

Supported payload types:

| Type             | Data                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `game`           | One basic `SavedGame`                                            |
| `games`          | Up to 10 basic games                                             |
| `advanced-game`  | One `AdvancedTrackedGame`                                        |
| `advanced-games` | Up to 10 advanced games                                          |
| `team`           | One `SavedTeam`, including that team's line presets when present |

`lib/sharing/types.ts` is the source of truth for the payload union. Basic payloads use
`CURRENT_SCHEMA_VERSION`; advanced payloads use `ADVANCED_TRACKING_SCHEMA_VERSION`.

## Delivery

`uploadPayload()` stores the serialized snapshot in the Supabase `shared_payloads` table under a
six-character ID and returns:

```text
https://u-stat.app/s/<payload-type>/<share-id>
```

The route `app/s/[kind]/[shareId].tsx` accepts only the supported payload types and declaratively
redirects to `/Import`. The import screen loads the payload through `useShareImport`, previews what
will be created or replaced, and performs the appropriate basic or advanced persistence action.

## Import Rules

- A game with an existing ID is presented as an update.
- Bulk imports report how many records already exist.
- Team imports detect an existing team ID and let the user choose whether to update the roster or
  keep the local copy.
- Imported records receive `importedAt`.
- Basic games and teams are written through `useGameStore`.
- Advanced games are written through `useSavedAdvancedGamesStore`, which persists them to SQLite.
- Team line presets are imported through `useLinePresetsStore`.
- Persistence must finish before navigation or another action invalidates the importing state.

## Validation and Limits

All downloaded data passes through `validatePayload()` before use. Validation rejects unsupported
schema versions and malformed or oversized records.

Current limits are defined in `lib/sharing/validate.ts`:

- 500 events per basic game
- 50 players per basic roster
- 100 points, 1,000 possessions, 5,000 actions, and 100 participants per advanced game
- 10 games per bulk payload
- 20 line presets per shared team
- 200 characters for validated strings

When these limits change, update validation tests and this document together.

## Key Files

| Area                 | Source                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| Payload union        | `lib/sharing/types.ts`                                                              |
| Serialization        | `lib/sharing/serialize.ts`                                                          |
| Validation           | `lib/sharing/validate.ts`                                                           |
| Upload and fetch     | `lib/sharing/share.ts`                                                              |
| Import state         | `hooks/useShareImport.ts`                                                           |
| Import UI            | `app/(main)/Import.tsx`                                                             |
| Deep-link redirect   | `app/s/[kind]/[shareId].tsx`                                                        |
| Basic persistence    | `store/basic/gameStore.ts`                                                          |
| Advanced persistence | `store/advancedTracking/savedGamesStore.ts`                                         |
| Payload tests        | `lib/__tests__/validatePayload.test.ts`, `lib/__tests__/sharingPayloadSize.test.ts` |

## Platform Setup

Universal-link and App Link declarations live in `app.config.js`. Supabase deployment is an
operational dependency outside this repository's React Native implementation. Before changing a
payload kind or URL shape, update the app route, platform declarations, validation, and tests as
one coordinated change.
